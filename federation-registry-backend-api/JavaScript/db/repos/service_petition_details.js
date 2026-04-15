const sql = require('../sql').service_petition_details;
var config = require('../../config');
const {getLocalizedColumns, getLocalizedLanguage, withLocalizedAliases, extractLocalizedPayload} = require('../../functions/localizedFields');
const cs = {}; // Reusable ColumnSet objects.

/*
 This repository mixes hard-coded and dynamic SQL, primarily to show a diverse example of using both.
 */

class ServicePetitionDetailsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    this._petitionLocalizationTableAvailable = null;
        // set-up all ColumnSet objects, if needed:
        createColumnsets(pgp);
    }



    // Save new Petition
    async add(body,sub){
      const localizedColumns = getLocalizedColumns();
      const normalized = withLocalizedAliases({...body});
      return this.db.one(sql.add,{
        service_description: normalized.service_description,
        [localizedColumns.service_description]: normalized[localizedColumns.service_description],
        service_name: normalized.service_name,
        [localizedColumns.service_name]: normalized[localizedColumns.service_name],
        logo_uri: normalized.logo_uri,
        integration_environment: normalized.integration_environment,
        requester: sub,
        country: normalized.country,
        protocol:normalized.protocol,
        group_id:normalized.group_id,
        organization_id: normalized.organization_id,
        aup_uri:normalized.aup_uri,
        check_group_membership:normalized.check_group_membership,
        require_vo_membership:normalized.require_vo_membership,
        rp_ensure_membership_desc:normalized.rp_ensure_membership_desc,
        require_group_membership:normalized.require_group_membership,
        rp_ensure_group_membership_desc:normalized.rp_ensure_group_membership_desc,
        create_group:normalized.create_group,
        allow_registration:normalized.allow_registration,
        dynamic_registration:normalized.dynamic_registration,
        registration_url:normalized.registration_url,
        service_login_url:normalized.service_login_url,
        [localizedColumns.service_login_url]: normalized[localizedColumns.service_login_url],
        tenant:normalized.tenant,
        type:normalized.type,
        status:(normalized.status?normalized.status:"pending"),
        service_id:normalized.service_id,
        comment:normalized.comment
      }).then(async result => {
        if (result && result.id) {
          await this.syncLocalization(result.id, normalized);
        }
        return result;
      })
    }

    async update(body,id){
        const localizedColumns = getLocalizedColumns();
        const normalized = withLocalizedAliases({...body});
        return this.db.none(sql.update,{
          service_description: normalized.service_description,
          [localizedColumns.service_description]: normalized[localizedColumns.service_description],
          service_name: normalized.service_name,
          [localizedColumns.service_name]: normalized[localizedColumns.service_name],
          logo_uri: normalized.logo_uri,
          country: normalized.country,
          integration_environment:normalized.integration_environment,
          id:id,
          type:normalized.type,
          protocol:normalized.protocol,
          check_group_membership:normalized.check_group_membership,
          require_vo_membership:normalized.require_vo_membership,
          rp_ensure_membership_desc:normalized.rp_ensure_membership_desc,
          require_group_membership:normalized.require_group_membership,
          rp_ensure_group_membership_desc:normalized.rp_ensure_group_membership_desc,
          create_group:normalized.create_group,
          allow_registration:normalized.allow_registration,
          dynamic_registration:normalized.dynamic_registration,
          registration_url:normalized.registration_url,
          service_login_url:normalized.service_login_url,
          [localizedColumns.service_login_url]: normalized[localizedColumns.service_login_url],
          status:"pending",
          aup_uri:normalized.aup_uri,
          organization_id:normalized.organization_id
        }).then(async result => {
          await this.syncLocalization(id, normalized);
          return result;
        })
    }

    async syncLocalization(owner_id, data){
      const hasTable = await this.hasPetitionLocalizationTable();
      if (!hasTable) {
        return null;
      }
      const payload = extractLocalizedPayload(data);
      if (!payload) {
        return null;
      }
      const query = "INSERT INTO service_petition_localizations (owner_id,language,service_name,service_description,service_login_url) VALUES (${owner_id},${language},${service_name},${service_description},${service_login_url}) ON CONFLICT (owner_id,language) DO UPDATE SET service_name=COALESCE(EXCLUDED.service_name,service_petition_localizations.service_name), service_description=COALESCE(EXCLUDED.service_description,service_petition_localizations.service_description), service_login_url=COALESCE(EXCLUDED.service_login_url,service_petition_localizations.service_login_url)";
      return this.db.none(query, {
        owner_id: +owner_id,
        language: getLocalizedLanguage(),
        ...payload,
      });
    }

    async hasPetitionLocalizationTable(){
      if (this._petitionLocalizationTableAvailable !== null) {
        return this._petitionLocalizationTableAvailable;
      }
      const result = await this.db.one('SELECT to_regclass($1) AS table_name', ['service_petition_localizations']);
      this._petitionLocalizationTableAvailable = !!(result && result.table_name);
      return this._petitionLocalizationTableAvailable;
    }

    async getServiceId(petition_id){
      return this.db.oneOrNone('SELECT service_id FROM service_petition_details WHERE id=$1',+petition_id).then(res=>{
        if(res){

          return res.service_id;
        }
        else {
          return false;
        }
      });
    }
    async findAllForList(){
      return this.db.any('SELECT id,service_description,logo_uri,service_name,requester,type,service_id,comment,status,integration_environment FROM service_petition_details WHERE reviewed_at IS NULL');
    }

    async findByServiceIds(ids){
      return this.db.any('SELECT id,service_description,logo_uri,service_name,requester,type,service_id,comment,status,integration_environment FROM service_petition_details WHERE service_id IN ($1:csv) AND reviewed_at IS NULL',ids);
    }
    async findBySubForList(sub){
      return this.db.any('SELECT id,service_description,logo_uri,service_name,requester,type,service_id,comment,status,integration_environment FROM service_petition_details WHERE requester = $1 AND reviewed_at IS NULL', sub);
    }
    async approveCreation(id,approved_by,status,comment,service_id,tenant){
       let date = new Date(Date.now());
       return this.db.none("UPDATE service_petition_details SET status=$1, reviewed_at=$2, reviewer=$3,service_id=$6, comment=$5 WHERE id=$4 AND tenant=$7",[status,date,approved_by,+id,comment,+service_id,tenant]);
    }

    async belongsToRequesterHistory(petition_id,sub){
      return this.db.oneOrNone('SELECT id FROM service_petition_details WHERE id = $1 AND requester= $2', [+petition_id,sub]).then(res=>{
        if(res){return true}else{return false}
      });
    }


    async belongsToRequester(petition_id,sub){
      return this.db.any(sql.belongsToRequester,{
        petition_id:petition_id,
        sub:sub
      }).then(petition_id=>{
        if(petition_id.length>0){
          return true;
        }
        else{
          return false;
        }
      })
    }

    async canBeEditedByRequester(petition_id,sub,tenant){
      const query = this.pgp.as.format(sql.canBeEditedByRequester,{
          id:+petition_id,
          sub:sub,
          tenant:tenant
        });
      return this.db.oneOrNone(query);
    }


    async review(id,approved_by,status,comment,tenant){
       let date = new Date(Date.now());
       return this.db.any("UPDATE service_petition_details SET status=$1, reviewed_at=$2, reviewer=$3, comment=$5 WHERE id=$4 AND tenant=$6 RETURNING *",[status,date,approved_by,+id,comment,tenant]);
    }

    async requestReview(id,comment){
      return this.db.none("UPDATE service_petition_details SET status='request_review', comment=$1 WHERE id=$2",[comment,+id]);
    }



     async getHistory(service_id,tenant){
       return await this.db.any("SELECT id,type,status,reviewed_at,comment from service_petition_details where service_id=$1 AND tenant=$2 ORDER BY reviewed_at ASC",[+service_id,tenant])
     }

     async deletePetition(petition_id){
       return this.db.oneOrNone('DELETE FROM service_petition_details WHERE id=$1 AND reviewed_at IS NULL RETURNING id',+petition_id);
     }

     async getEnvironment(petition_id,tenant){
       const query = this.pgp.as.format('SELECT integration_environment FROM service_petition_details WHERE id=$1 and tenant=$2',[+petition_id,tenant]);
       return await this.db.oneOrNone(query).then(result => {
          if(result){
            return result.integration_environment;

          }
          else{
            return null;
          }
        });
     }

     async getTicketInfo(ids){
      try{
        let tenant_selector_array = [];
        for(const tenant in tenant_config){
          if(tenant_config[tenant].service_integration_notification.enabled){
            tenant_selector_array.push("(tenant='"+tenant+"' AND integration_environment IN ('" + tenant_config[tenant].service_integration_notification.integration_environments.join("','") +"'))")
          }
         }
         let tenant_selector = tenant_selector_array.length>0?" AND ("+tenant_selector_array.join(" OR ") + ") ":" AND false ";
         const query = this.pgp.as.format(sql.getTicketInfo,{ids:ids,tenant_selector:tenant_selector});
         return this.db.any(query);
      }
      catch(err){
        console.log(err);
      }
     }

     async getDetails(petition_id,tenant){
       return this.db.oneOrNone('SELECT service_name,integration_environment,type,preferred_username as username,email FROM (SELECT service_name,integration_environment,type,requester FROM service_petition_details WHERE id=$1 AND tenant=$2)as petition LEFT JOIN user_info ON petition.requester=user_info.sub',[+petition_id,tenant])
     }





     async openPetition(service_id,tenant){
       return this.db.oneOrNone("SELECT id FROM service_petition_details WHERE service_id = $1 AND reviewed_at IS NULL AND tenant=$2", [+service_id,tenant]).then(result => {
         if(result){
           return result.id;
         }
         else{
           return false
         }
         });
     }



}

//////////////////////////////////////////////////////////
// Example of statically initializing ColumnSet objects:

function createColumnsets(pgp) {
    // create all ColumnSet objects only once:
    if (!cs.insert) {
        // Type TableName is useful when schema isn't default "public" ,
        // otherwise you can just pass in a string for the table name.
        const table = new pgp.helpers.TableName({table: 'service_petition_details', schema: 'public'});
        const localizedColumns = getLocalizedColumns();

        cs.insert = new pgp.helpers.ColumnSet(['service_description',localizedColumns.service_description,'service_name',localizedColumns.service_name,'country',
                'service_login_url',localizedColumns.service_login_url,'logo_uri','integration_environment','requester','protocol','comment'],
          {table});
        cs.update = cs.insert.extend(['?id','state','type','reviewed_at','reviewer','service_id']);
    }
    return cs;
}

module.exports = ServicePetitionDetailsRepository;
