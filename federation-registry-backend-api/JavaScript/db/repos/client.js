const {extractServiceBoolean} = require("../../functions/helpers");
const sql = require('../sql').client;

class ClientRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
        // set-up all ColumnSet objects, if needed:
    }

    async get(id){
        return this.db.oneOrNone(sql.getClient,{
            id:+id,
        }).then(result => {
            if(result){
                result.json.generate_client_secret = false;
                return result.json()
            } else {
                return null;
            }
        });
    }

    async getServiceClientIds(service_id) {
        return this.db.any("SELECT id FROM client_details WHERE service_id=$1 and deleted=false", [+service_id]);
    }

}

module.exports = ClientRepository