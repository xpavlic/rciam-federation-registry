var config = require('../../config');
let cs= {};


class ServiceMultiValuedRepository {
  constructor(db,pgp){
    this.db = db;
    this.pgp = pgp;
    // set-up all ColumnSet objects, if needed:
    cs.multi = new pgp.helpers.ColumnSet(['owner_id','value']);
    cs.serviceBooleanPet = new pgp.helpers.ColumnSet(['petition_id','name','value']);
    cs.serviceBooleanSer = new pgp.helpers.ColumnSet(['service_id','name','value']);
    cs.serviceBooleanSerUpd = new pgp.helpers.ColumnSet(['?service_id','?name','value'],{table:'service_boolean'});
    cs.serviceBooleanPetUpd = new pgp.helpers.ColumnSet(['?petition_id','?name','value'],{table:'service_petition_boolean'});
  }


  async updateServiceBoolean(type,service,id){
    // updateData = [{id:1,state:'deployed'},{id:2,state:'deployed'},{id:3,state:'failed'}];
    let data = [];
    let upd_cs;
    id = parseInt(id);
    for(const property in service){
      if(Object.keys(config[service.tenant].form.extra_fields).includes(property) && (config[service.tenant].form.extra_fields[property].tag==='coc'||(config[service.tenant].form.extra_fields[property].tag==='once'&&(service[property] === 'true'||service[property]===true)))){
        if(type==='petition'){
          data.push({petition_id:id,name:property,value:(service[property] === 'true'||service[property]===true)});
          upd_cs = cs.serviceBooleanPetUpd;
        }
        else{
          data.push({service_id:id,name:property,value:(service[property] === 'true'||service[property]===true)});
          upd_cs = cs.serviceBooleanSerUpd;
        }
      }
    }
    if(data.length>0){
      const query = this.pgp.helpers.update(data,upd_cs) + ' WHERE '+(type==='service'?'v.service_id = t.service_id ':'v.petition_id =t.petition_id ') +'and v.name = t.name RETURNING t.id';

      return this.db.any(query).then(data => {
        return true;
      })
    }else{
      return true;
    }
  }

  

  async addServiceBoolean(type,service,id){
    let data = [];
    let add_cs = {};
    let table_name;
      for(const property in service){
        if(Object.keys(config[service.tenant].form.extra_fields).includes(property)){
          if(config[service.tenant].form.extra_fields[property].tag==='coc'||config[service.tenant].form.extra_fields[property].tag==='once'){
            if(type==='petition'){
              data.push({petition_id:id,name:property,value:(service[property] === 'true'||service[property]===true)});
              add_cs = cs.serviceBooleanPet;
              table_name = "service_petition_boolean";
            }
            else{
              data.push({service_id:id,name:property,value:(service[property] === 'true'||service[property]===true)});
              add_cs = cs.serviceBooleanSer;
              table_name = "service_boolean";
            }
          }
        }
  
      }
      if(data&&data.length>0){
          const query = this.pgp.helpers.insert(data,add_cs,table_name);
          return this.db.none(query).then(data => {
            return true;
          })
      }else{
        return true;
      }
  }

  async add(type,attribute,data,id){

    let values = []
    let name = 'service_'
    if(type==='petition'){
      name = name + type + '_' + attribute;
    }
    else{
      name = name + attribute;
    }
    // if not Empty array
    if(data&&data.length>0){
      data.forEach((item)=>{
        values.push({owner_id:id,value:item});
      });

      const query = this.pgp.helpers.insert(values, cs.multi,name);
      return this.db.none(query)
      .then(data => {
          return 'success'
      })
      .catch(error => {
          return 'error'
      });
    }
    else{
      return null
    }
  }


  async findDataById(name,id){
    const table = new this.pgp.helpers.TableName({table:name});
    return this.db.any('SELECT owner_id,value FROM $1 WHERE owner_id IN ($2:csv)',[table,id]);
  }

  async delete_one_or_many(type,attribute,data,owner_id){
    let name = 'service_'
    if(type==='petition'){
      name = name + type + '_' + attribute;
    }
    else{
      name = name + attribute;
    }
    const table = new this.pgp.helpers.TableName({table:name});
    if(data&&data.length>0){

      return this.db.result('DELETE FROM $1 WHERE owner_id=$2 AND value IN ($3:csv)',[table,+owner_id,data]).then(result =>{
        // if(result.rowCount===data.length){
        //   return true
        // }
        // else{
        //   return false
        // }
        return result
      });
    }
  }

  async delete(name,owner_id){
      const table = new this.pgp.helpers.TableName({table:name});
      return this.db.none('DELETE FROM $1 WHERE owner_id=$2',[table,+owner_id]);
  }

}

module.exports = ServiceMultiValuedRepository;
