var config = require('../../config');
let cs= {};


class ClientMultiValuedRepository {
    constructor(db,pgp){
        this.db = db;
        this.pgp = pgp;
        // set-up all ColumnSet objects, if needed:
        cs.clientSamlAttributes = new pgp.helpers.ColumnSet(['owner_id','friendly_name','name','required','name_format']);
        cs.updateSamlAttributes = new pgp.helpers.ColumnSet(['?owner_id','friendly_name','name','required','name_format']);
        cs.multi = new pgp.helpers.ColumnSet(['owner_id','value']);
    }


    async updateSamlAttributes(type,data,client_id){
        if(data&&data.length>0){
            for(const item of data) {
                item.owner_id = parseInt(client_id);
            }
            const query = this.pgp.helpers.update(data,cs.updateSamlAttributes,type==='petition'?'client_petition_saml_attributes':'client_saml_attributes') + ' WHERE v.owner_id = t.owner_id AND v.friendly_name=t.friendly_name';
            return this.db.none(query).then(res=>{
                return true
            }).catch(error=>{
                throw error
            });
        }
        else{
            return true;
        }
    }


    async addSamlAttributes(type,data,client_id){
        if(data && data.length>0){
            for(const item of data) {
                item.owner_id = client_id;
            }
            const query = this.pgp.helpers.insert(data,cs.clientSamlAttributes,type==='petition'?'client_petition_saml_attributes':'client_saml_attributes');
            return this.db.none(query).then(data => {
                return true
            })
                .catch(error => {
                    throw error
                });

        }else{
            return true
        }
    }


    async addSamlAttributesMultiple(data,table){
        //console.log(data);.
        if(data&&data.length>0){
            const query = this.pgp.helpers.insert(data,cs.clientSamlAttributes,table);
            return this.db.none(query).then(data => {
                return true
            })
                .catch(error => {
                    throw error
                });
        }
    }

    async deleteSamlAttributes(type,data,client_id){
        let attribute_values = [];
        data.forEach(attribute=>{
            attribute_values.push(attribute.friendly_name)
        })

        if(data&&data.length>0){
            try{
                const query = this.pgp.as.format('DELETE FROM ' + (type==='petition'?'client_petition_saml_attributes':'client_saml_attributes') +' WHERE owner_id=$1 AND friendly_name IN ($2:csv)',[+client_id,attribute_values]);
                return this.db.any(query).then(result =>{

                    return result
                });

            }
            catch(err){
                console.log(err);
            }
        }
    }


    async addMultiple(data,table){
        const query = this.pgp.helpers.insert(data,cs.multi,table);
        return this.db.none(query).then(data => {
            return true
        })
            .catch(error => {
                throw error
            });
    }

    async add(type,attribute,data,id){

        let values = []
        let name = 'client_'
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

    async delete_one_or_many(type,attribute,data,owner_id){
        let name = 'client_'
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


    async findDataById(name,id){
        const table = new this.pgp.helpers.TableName({table:name});
        return this.db.any('SELECT owner_id,value FROM $1 WHERE owner_id IN ($2:csv)',[table,id]);
    }

    async delete(name,owner_id){
        const table = new this.pgp.helpers.TableName({table:name});
        return this.db.none('DELETE FROM $1 WHERE owner_id=$2',[table,+owner_id]);
    }

}

module.exports = ClientMultiValuedRepository;
