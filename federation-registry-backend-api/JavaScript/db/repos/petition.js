const sql = require('../sql').petition;
const {calcServiceDiff, calcClientDiff, extractServiceBoolean} = require('../../functions/helpers.js');
const cs = {}; // Reusable ColumnSet objects.
const {sendMail} = require('../../functions/helpers.js');
/*
 This repository mixes hard-coded and dynamic SQL, primarily to show a diverse example of using both.
 */

class PetitionRepository {
  constructor(db, pgp) {
      this.db = db;
      this.pgp = pgp;
      // set-up all ColumnSet objects, if needed:
  }


  async get(id,tenant){
    return this.db.oneOrNone(sql.getPetition,{
      id:+id,
      tenant:tenant
    }).then(result => {
      if(result){
        return fixPetition(result);
      }
      else {
        return null
      }
    })
  }

  async getClientPetition(id) {
    return this.db.oneOrNone(sql.getClientPetition, {id: +id}).then(result => {
      if (result) {
        return result.json();
      } else {
        return null;
      }
    })
  }

  async canReviewOwn(petition_id,sub){
    return this.db.oneOrNone(sql.canReviewOwn,{
      sub:sub,
      id:+petition_id
    })
  }
  async getOwnOld(id,sub,tenant){
    return this.db.oneOrNone(sql.getOldOwnPetition,{
      sub:sub,
      id:+id,
      tenant:tenant
    }).then(result => {
      if(result){
        return fixPetition(result);

      }
      else {
        return null
      }
    })
  }
  async getOld(id,sub,tenant){
    return this.db.oneOrNone(sql.getOldPetition,{
      sub:sub,
      id:+id,
      tenant:tenant
    }).then(result => {
      if(result){
        return fixPetition(result);
      }
      else {
        return null
      }
    })
  }

  async getLastStateId(id){
    return this.db.oneOrNone(sql.getLastStateId,{id:+id}).then(result=>{
      if(result){
        return result.id
      }
      else{
        return null;
      }
    })
  }

  async getOwn(id,sub,tenant){
    return this.db.oneOrNone(sql.getOwnPetition,{
      sub:sub,
      id:+id,
      tenant:tenant
    }).then(result => {
      if(result){
        return fixPetition(result);

      }
      else {
        return null
      }
    })
  }

  async addClientPetition(client_petition, service_petition_id, t) {
    let queries = [];
    const cpd_result = await t.client_petition_details.add(client_petition, service_petition_id);
    if (cpd_result) {
      queries.push(t.client_details_protocol.add('petition', client_petition, cpd_result.id));
      if (client_petition.protocol === 'oidc') {
        queries.push(
            t.client_multi_valued.add('petition', 'oidc_grant_types', client_petition.grant_types, cpd_result.id),
            t.client_multi_valued.add('petition', 'oidc_scopes', client_petition.scope, cpd_result.id),
            t.client_multi_valued.add('petition', 'oidc_redirect_uris', client_petition.redirect_uris, cpd_result.id),
            t.client_multi_valued.add('petition', 'oidc_post_logout_redirect_uris', client_petition.post_logout_redirect_uris, cpd_result.id)
        );
      } else if (client_petition.protocol === 'saml') {
        queries.push(t.client_multi_valued.addSamlAttributes('petition', client_petition.requested_attributes, cpd_result.id));
      }
      await t.batch(queries);
    }
  }


  async add(petition, requester) {
    return this.db.tx('add-service', async t => {
      if (!petition.group_id && petition.type === 'create') {
        petition.group_id = await t.group.addGroup(requester);
      }
      const spd_result = await t.service_petition_details.add(petition, requester);
      if (spd_result) {
        const queries = [
            t.service_contacts.add('petition', petition.contacts, spd_result.id),
            t.service_multi_valued.addServiceBoolean('petition', petition, spd_result.id)
        ];
        await Promise.all(petition.client_petitions.map(client_petition => this.addClientPetition(client_petition, spd_result.id, t)));
        await t.batch(queries);
        return spd_result.id;
      }
    });
  }


  async update(newState,targetId,tenant){
    try{
      return this.db.tx('update-service',async t =>{
        let queries = [];
        return t.petition.get(targetId,tenant).then(async oldState=>{
          if(oldState){
            let serviceEdits = calcServiceDiff(oldState.service_data,newState,tenant);
            if(Object.keys(serviceEdits.details).length !== 0){
               queries.push(t.service_petition_details.update(serviceEdits.details,targetId));
            }
            for (var key in serviceEdits.add){
              if(key==='contacts') {
                queries.push(t.service_contacts.add('petition',serviceEdits.add[key],targetId));
              } else if(key === 'service_boolean'){
                queries.push(t.service_multi_valued.addServiceBoolean('petition',{...serviceEdits.add[key],tenant:tenant},targetId));
              } else {
                queries.push(t.service_multi_valued.add('petition',key,serviceEdits.add[key],targetId));
              } 
            }
            for (var key in serviceEdits.update){
              if(key === 'service_boolean'){
                queries.push(t.service_multi_valued.updateServiceBoolean('petition',{...serviceEdits.update[key],tenant:tenant},targetId));
              }
            }
            for (var key in serviceEdits.dlt){
              if(key==='contacts'){queries.push(t.service_contacts.delete_one_or_many('petition',serviceEdits.dlt[key],targetId));}
              else {queries.push(t.service_multi_valued.delete_one_or_many('petition',key,serviceEdits.dlt[key],targetId));}
            }

            //Client petitions update
            for (const client_petition of newState.client_petitions) {
              if (client_petition.type === 'create') {
                await this.addClientPetition(client_petition, targetId, t);
              } else if (client_petition.type === 'delete') {
                t.client_petition_details.deletePetition(client_petition.id);
              } else {
                return t.petition.getClientPetition(client_petition.id).then(async clientPetitionOldState => {
                  let clientEdits = calcClientDiff(clientPetitionOldState,client_petition,tenant);
                  if(Object.keys(clientEdits.details).length !== 0){
                    queries.push(t.client_details_protocol.update('petition',clientEdits.details,targetId));
                  }
                  for (var key in clientEdits.add){
                    if(key==='requested_attributes'){queries.push(t.client_multi_valued.addSamlAttributes('petition',clientEdits.add[key],targetId))}
                    else {queries.push(t.client_multi_valued.add('petition',key,clientEdits.add[key],targetId));}
                  }
                  for (var key in clientEdits.update){
                    if(key==='requested_attributes'){queries.push(t.client_multi_valued.updateSamlAttributes('petition',clientEdits.update[key],targetId))}}
                  for (var key in clientEdits.dlt){
                    if(key==='requested_attributes'){queries.push(t.client_multi_valued.deleteSamlAttributes('petition',clientEdits.dlt[key],targetId))}
                    else {queries.push(t.client_multi_valued.delete_one_or_many('petition',key,clientEdits.dlt[key],targetId));}
                  }
                });
              }
            }

            var result = await t.batch(queries);
            if(result){
              if(oldState.meta_data.status==='changes'){

                //TODO WILL NEED UPDATE
                await t.user.getUsersByAction('review_notification',tenant).then(users=>{
                  sendMail({subject:'New Petition to Review',service_name:newState.service_name,integration_environment:newState.integration_environment,tenant:tenant,url:(oldState.meta_data.service_id?"/services/"+oldState.meta_data.service_id:"")+"/requests/"+targetId+"/review"},'reviewer-notification.html',users);
                })
              }
              return {success:true};
            }
          }
        }).catch(err =>{
          return {success:false,error:err}
        });
      });
    }
    catch(err){
      return {success:false,error:err}
    }
  }

}

const fixPetition = (result) => {
  let data = {};
  result.json.generate_client_secret = false;
  data.meta_data = {};
  data.meta_data.type = result.json.type;
  data.meta_data.comment = result.json.comment;
  data.meta_data.submitted_at = result.json.submitted_at;
  data.meta_data.group_id = result.json.group_id;
  data.meta_data.requester = result.json.requester;
  data.meta_data.service_id = result.json.service_id;
  data.meta_data.status = result.json.status;
  data.meta_data.reviewed_at = result.json.reviewed_at;

  delete result.json.group_id;
  delete result.json.status;
  delete result.json.reviewed_at;
  delete result.json.type;
  delete result.json.service_id;
  delete result.json.requester;
  delete result.json.comment;
  delete result.json.submitted_at;
  data.service_data = extractServiceBoolean(result.json);
  return data
}




//////////////////////////////////////////////////////////
// Example of statically initializing ColumnSet objects:



module.exports = PetitionRepository;
