const sql = require('../sql').client_details;
var config = require('../../config');
const cs = {}; // Reusable ColumnSet objects.

/*
 This repository mixes hard-coded and dynamic SQL, primarily to show a diverse example of using both.
 */

class ClientDetailsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }

    // Save new Petition
    async add(body,service_id){
        return this.db.one(sql.add,{
            service_id: service_id,
            client_description: body.client_description,
            client_name: body.client_name,
            protocol: body.protocol,
        })
    }

    async update(body,id){
        return this.db.none(sql.update,{
            external_id: body.external_id,
            client_description: body.client_description,
            client_name: body.client_name,
            protocol: body.protocol,
            id: id
        })
    }

    async delete(id){
        try {
            return this.db.tx('update-client',async t =>{
                let queries = [];
                queries.push(t.client_state.update(id,'pending','delete'));
                //queries.push(t.none('UPDATE client_details SET deleted=TRUE WHERE id=$1',+id));
                var result = await t.batch(queries);
                if(result){
                    return true
                }
                else {
                    return false
                }
            })
        }
        catch(err){
            return false
        }
    }
}

module.exports = ClientDetailsRepository;
