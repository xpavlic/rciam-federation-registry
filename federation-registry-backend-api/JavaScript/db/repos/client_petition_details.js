const sql = require('../sql').client_petition_details;
var config = require('../../config');
const cs = {}; // Reusable ColumnSet objects.

/*
 This repository mixes hard-coded and dynamic SQL, primarily to show a diverse example of using both.
 */

class ClientPetitionDetailsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }



    // Save new Petition
    async add(body,service_petition_id){
        return this.db.one(sql.add,{
            service_petition_id: service_petition_id,
            client_description: body.client_description,
            client_name: body.client_name,
            protocol: body.protocol,
            type: body.type
        })
    }

    async update(body,id){
        return this.db.none(sql.update,{
            client_id: body.client_id,
            client_description: body.client_description,
            client_name: body.client_name,
            protocol: body.protocol,
            type: body.type,
            id: id
        })
    }

    async deletePetition(petition_id){
        return this.db.oneOrNone('DELETE FROM client_petition_details WHERE id=$1 RETURNING id',+petition_id);
    }
}

module.exports = ClientPetitionDetailsRepository;
