

let cs = {}; // Reusable ColumnSet objects.

/*
 This repository mixes hard-coded and dynamic SQL, primarily to show a diverse example of using both.
 */

class ClientErrorsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
        const table = new pgp.helpers.TableName({table: 'client_errors', schema: 'public'});
        // set-up all ColumnSet objects, if needed:
        cs.insert = new pgp.helpers.ColumnSet(['error_description','error_code','client_id','date'],{table});
    }

    async add(errors){
      const query = this.pgp.helpers.insert(errors,cs.insert);
      let stuff = await this.db.any(query);
      return true
    }

    async getErrorByClientId(id){
      return this.db.oneOrNone('SELECT date as error_date,error_code,error_description FROM client_errors WHERE client_id=$1 AND archived=false',+id);
    }

    async archive(id){
      return this.db.oneOrNone('UPDATE client_errors SET archived=true WHERE client_id=$1 and archived=false RETURNING service_id',+id);
    }


}

//////////////////////////////////////////////////////////
// Example of statically initializing ColumnSet objects:



module.exports = ClientErrorsRepository;
