const sql = require('../sql').service_state;
let cs= {};

class ServiceStateRepository {
  constructor(db,pgp){
    this.db = db;
    this.pgp = pgp;
    // set-up all ColumnSet objects, if needed:
    cs.update_multi = new pgp.helpers.ColumnSet(['?id','state',{name: 'last_edited', mod: '^', def: 'CURRENT_TIMESTAMP'}],{table:'service_state'});
     cs.update_multi_outdated = new pgp.helpers.ColumnSet(['?id','state',{name: 'last_edited', mod: '^', def: 'CURRENT_TIMESTAMP'},'outdated'],{table:'service_state'});
     cs.insert_multi = new pgp.helpers.ColumnSet(['id','state',{name: 'last_edited', mod: '^', def: 'CURRENT_TIMESTAMP'},'outdated'],{table:'service_state'});
  }
  async addMultiple(service_state_data){
      const insert = this.pgp.helpers.insert(service_state_data,cs.insert_multi)+'RETURNING *';
      return await this.db.any(insert).then((result)=>{
        if(result.length===service_state_data.length){
          return true
        }
        else{
          throw 'Could not add service state';
        }
      });

  }

  async getOutdatedOwners(tenant,integration_environment){

    let integration_environment_filter = "";
    if(integration_environment){
      integration_environment_filter = " AND sd.integration_environment='"+integration_environment+"'";
    }
    return await this.db.any(sql.getOutdatedOwners,{tenant:tenant,integration_environment_filter:integration_environment_filter});
  }

  async getOutdatedServices(tenant){
    const query = this.pgp.as.format(sql.getOutdatedServices,{tenant:tenant});
    return await this.db.any(sql.getOutdatedServices,{tenant:tenant});
  }



  async add(id,state,deployment_type){
    let date = new Date(Date.now());
    return this.db.any(sql.add,{
      id:+id,
      state:state,
      deployment_type:deployment_type
    });
  }
  async update(id,state,deployment_type){
    return this.db.any(sql.update,{
      id:+id,
      state:state,
      deployment_type:deployment_type,
      outdated:false
    })
  }

  async resend(id){
    return this.db.one("UPDATE service_state SET state='pending',last_edited=current_timestamp WHERE id=$1 RETURNING id",+id)
  }


  async deploymentUpdate(messages){
    let updateState=[];
    let updateClientId =[];
    let updateExternalId = [];
    let ids=[];
    let errors=[];
    let batch_queries = [];
    let date = new Date(Date.now());
    return this.db.task('deploymentTasks', async t => {
      for(let index=0;index<messages.length;index++){
        //let decoded_message= JSON.parse(Buffer.from(messages[index].message.data, 'base64').toString());
        let decoded_message=messages[index];
        let done = await t.deployment_tasks.resolveTask(decoded_message.id,decoded_message.deployer_name);
        let deployed = await t.deployment_tasks.isDeploymentFinished(decoded_message.id);
        // If we have a an error or if the deployment has finished we have to update the service state
        if(decoded_message.external_id){
          updateExternalId.push({id:decoded_message.id,external_id:decoded_message.external_id});
        }
        if(decoded_message.client_id){
          updateClientId.push({id:decoded_message.id,client_id:decoded_message.client_id});
        }
        if((deployed || decoded_message.state==='error')&&done){
          updateState.push({id:decoded_message.id,state:decoded_message.state,outdated:false});
          if(deployed&&decoded_message.state!=='error'){
            ids.push(decoded_message.id); 
          }
          if(decoded_message.state==='error'){
            errors.push({date:date,service_id:decoded_message.id,error_code:decoded_message.status_code,error_description:decoded_message.error_description})
          }
        }
      }
	    
      if(errors.length>0){
        batch_queries.push(t.service_errors.add(errors));
      }
      if(updateClientId.length>0){
        batch_queries.push(t.service_details_protocol.updateClientId(updateClientId));
      }
      if(updateExternalId.length>0){
        batch_queries.push(t.service_details.updateExternalId(updateExternalId));
      }
      if(updateState.length>0){
        batch_queries.push(t.service_state.updateMultiple(updateState));
      }
      if(ids.length>0){
        batch_queries.push(t.service_state.delete(ids));
        batch_queries.push(t.service_state.setCreatedAt(ids));
      }
      if(batch_queries.length>0){
        let batch_result = await t.batch(batch_queries).catch(err=>{
          throw err;
        });
      }
      return {deployed_ids:ids,errors:errors};

    });
  }

  async setCreatedAt(ids){
    return this.db.any("UPDATE service_state set created_at=CURRENT_TIMESTAMP where id IN($1:csv) AND deployment_type='create' AND state='deployed'",[ids]);

  }
  // Of the Services that have finished deployment (ids) delete those that were pending deletion
  async delete(ids){
    return this.db.any("UPDATE service_details SET deleted=true WHERE id IN (SELECT id FROM service_state WHERE deployment_type='delete' AND id IN($1:csv))",[ids])
  }

  async updateOutdated(ids){
    let services_turned_outdated = 0;
    let services_turned_up_to_date = 0;
    if(ids.length===0){
      ids.push(0);
    }
    const query = this.pgp.as.format("UPDATE service_state SET outdated=true WHERE id IN($1:csv) AND outdated=false RETURNING *",[ids]);
    return this.db.any(query).then(async result=>{
      if(result){
        services_turned_outdated = result.length;
        return await this.db.any("UPDATE service_state SET outdated=false WHERE id NOT IN($1:csv) AND outdated=true RETURNING *",[ids]).then(result=>{
          services_turned_up_to_date = result.length;
          return ({
            services_turned_outdated:services_turned_outdated,
            services_turned_up_to_date:services_turned_up_to_date
          })
        }) 
      }
    })
  }

  async getState(id){
    return this.db.oneOrNone("SELECT * from service_state where id=$1",+id);
  }


  async updateMultiple(updateData){
    // updateData = [{id:1,state:'deployed'},{id:2,state:'deployed'},{id:3,state:'failed'}];
    let date = new Date(Date.now());

    
    const update = this.pgp.helpers.update(updateData,(updateData[0].hasOwnProperty('outdated')?cs.update_multi_outdated:cs.update_multi)) + ' WHERE v.id = t.id RETURNING t.id';
    //=> UPDATE "service_data" AS t SET "state"=v."state"
    //   FROM (VALUES(1,'deployed'),(2,'deployed'),(3,'failed'))
    //   AS v("id","state") WHERE v.id = t.id
    return await this.db.any(update).then((ids)=>{
      if(ids.length===updateData.length){
        return true
      }
      else{
        throw 'Could not update service state';
      }
    });
  }






}

module.exports = ServiceStateRepository;
