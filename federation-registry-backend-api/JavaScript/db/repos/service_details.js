const sql = require('../sql').service_details;
const {getLocalizedColumns, getLocalizedLanguage, withLocalizedAliases, extractLocalizedPayload} = require('../../functions/localizedFields');

let cs = {}; // Reusable ColumnSet objects.

/*
 This repository mixes hard-coded and dynamic SQL, primarily to show a diverse example of using both.
 */

class ServiceDetailsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    this._serviceLocalizationTableAvailable = null;

        // set-up all ColumnSet objects, if needed:

        createColumnsets(pgp);

    }

    async add(data,sub){
      const localizedColumns = getLocalizedColumns();
      const normalized = withLocalizedAliases({...data});
      return this.db.one(sql.add,{
        service_description: normalized.service_description,
        [localizedColumns.service_description]: normalized[localizedColumns.service_description],
        service_name: normalized.service_name,
        [localizedColumns.service_name]: normalized[localizedColumns.service_name],
        logo_uri: normalized.logo_uri,
        integration_environment: normalized.integration_environment,
        requester: sub,
        group_id:normalized.group_id,
        country:normalized.country,
        protocol:normalized.protocol,
        tenant:normalized.tenant,
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
        organization_id:normalized.organization_id,
        aup_uri:normalized.aup_uri
      }).then(async result => {
        if (result && result.id) {
          await this.syncLocalization(result.id, normalized);
        }
        return result;
      })
    }


    async addMultiple(services){
      const normalizedServices = services.map((service) => withLocalizedAliases({...service}));
      const query = this.pgp.helpers.insert(normalizedServices,cs.insert_multi,'service_details')+"RETURNING id";
      return this.db.any(query)
      .then(service_ids => {
          normalizedServices.forEach((service,index)=> {
            normalizedServices[index].id = service_ids[index].id;
          });
          return this.syncLocalizationMultiple(normalizedServices).then(() => normalizedServices);
      })
      .catch(error => {
          throw error
      });
    }

    async update(data,id,sub){
        const localizedColumns = getLocalizedColumns();
        const normalized = withLocalizedAliases({...data});
        return this.db.oneOrNone(sql.update,{
          service_description: normalized.service_description,
          [localizedColumns.service_description]: normalized[localizedColumns.service_description],
          service_name: normalized.service_name,
          [localizedColumns.service_name]: normalized[localizedColumns.service_name],
          logo_uri: normalized.logo_uri,
          country:normalized.country,
          integration_environment:normalized.integration_environment,
          requester:sub,
          id:id,
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
          aup_uri:normalized.aup_uri,
          organization_id:normalized.organization_id
        }).then(async result => {
          await this.syncLocalization(id, normalized);
          return result;
        });
    }

    async syncLocalization(owner_id, data){
      const hasTable = await this.hasServiceLocalizationTable();
      if (!hasTable) {
        return null;
      }
      const payload = extractLocalizedPayload(data);
      if (!payload) {
        return null;
      }
      const query = "INSERT INTO service_localizations (owner_id,language,service_name,service_description,service_login_url) VALUES (${owner_id},${language},${service_name},${service_description},${service_login_url}) ON CONFLICT (owner_id,language) DO UPDATE SET service_name=COALESCE(EXCLUDED.service_name,service_localizations.service_name), service_description=COALESCE(EXCLUDED.service_description,service_localizations.service_description), service_login_url=COALESCE(EXCLUDED.service_login_url,service_localizations.service_login_url)";
      return this.db.none(query, {
        owner_id: +owner_id,
        language: getLocalizedLanguage(),
        ...payload,
      });
    }

    async syncLocalizationMultiple(services){
      const hasTable = await this.hasServiceLocalizationTable();
      if (!hasTable) {
        return null;
      }
      const localizations = services
        .map((service) => {
          const payload = extractLocalizedPayload(service);
          if (!payload || !service.id) {
            return null;
          }
          return {
            owner_id: service.id,
            language: getLocalizedLanguage(),
            ...payload,
          };
        })
        .filter(Boolean);

      if (localizations.length === 0) {
        return null;
      }

      const insertColumns = new this.pgp.helpers.ColumnSet(['owner_id', 'language', 'service_name', 'service_description', 'service_login_url'], {table: 'service_localizations'});
      const query = this.pgp.helpers.insert(localizations, insertColumns) + " ON CONFLICT (owner_id,language) DO UPDATE SET service_name=COALESCE(EXCLUDED.service_name,service_localizations.service_name), service_description=COALESCE(EXCLUDED.service_description,service_localizations.service_description), service_login_url=COALESCE(EXCLUDED.service_login_url,service_localizations.service_login_url)";
      return this.db.none(query);
    }

    async hasServiceLocalizationTable(){
      if (this._serviceLocalizationTableAvailable !== null) {
        return this._serviceLocalizationTableAvailable;
      }
      const result = await this.db.one('SELECT to_regclass($1) AS table_name', ['service_localizations']);
      this._serviceLocalizationTableAvailable = !!(result && result.table_name);
      return this._serviceLocalizationTableAvailable;
    }


    async getProtocol(service_id,sub,tenant){
      return this.db.oneOrNone("SELECT protocol FROM ((SELECT protocol,group_id,deleted,id FROM service_details WHERE id=$1 AND tenant=$3) as service_details LEFT JOIN service_state ON service_details.id=service_state.id AND (deleted=false OR (deleted=TRUE AND state!='deployed'))) as service LEFT JOIN (SELECT id AS group_id,sub FROM groups LEFT JOIN group_subs ON groups.id=group_subs.group_id WHERE sub=$2) AS foo USING (group_id) WHERE sub IS NOT NULL",[+service_id,sub,tenant]);
    }


    async belongsToRequester(service_id,sub){
      if(sub==='admin'){
        return this.db.oneOrNone("SELECT protocol,state FROM service_details JOIN service_state USING (id) WHERE id = $1 AND deleted=false", [+service_id]);
      }
      else{
        return this.db.oneOrNone("SELECT protocol,state FROM service_details JOIN service_state USING (id) WHERE id = $1 AND requester= $2 AND deleted=false", [+service_id,sub]);
      }
    }

    async delete(id){
      try {
        return this.db.tx('update-service',async t =>{
          let queries = [];
          queries.push(t.service_state.update(id,'pending','delete'));
          //queries.push(t.none('UPDATE service_details SET deleted=TRUE WHERE id=$1',+id));
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

    async updateExternalId(updateData){
      const update = this.pgp.helpers.update(updateData, cs.external_id) + ' WHERE v.id = t.id RETURNING t.id';
      
      return this.db.any(update).then((ids)=>{
        if(ids.length===updateData.length){
          return true
        }
        else{
          return false
        }
      }).catch(error=>{
        return false
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
        const table = new pgp.helpers.TableName({table: 'service_details', schema: 'public'});
        const localizedColumns = getLocalizedColumns();

        cs.insert = new pgp.helpers.ColumnSet(['service_description',localizedColumns.service_description,'service_name',localizedColumns.service_name,
                      'service_login_url',localizedColumns.service_login_url,'logo_uri','integration_environment','country','requester','protocol','check_group_membership','require_vo_membership','rp_ensure_membership_desc','require_group_membership','rp_ensure_group_membership_desc','create_group','allow_registration','dynamic_registration','registration_url','aup_uri','organization_id'],
          {table});
        cs.insert_multi = new pgp.helpers.ColumnSet(['external_id','tenant','service_name',localizedColumns.service_name,'group_id','service_description',localizedColumns.service_description,'service_login_url',localizedColumns.service_login_url,'logo_uri','country','integration_environment','protocol','check_group_membership','require_vo_membership','rp_ensure_membership_desc','require_group_membership','rp_ensure_group_membership_desc','create_group','allow_registration','dynamic_registration','registration_url','aup_uri','organization_id'])
        cs.update = cs.insert.extend(['?id','deleted']);
        cs.external_id = new pgp.helpers.ColumnSet(['?id','external_id'],{table:'service_details'});
    }
    return cs;
}

module.exports = ServiceDetailsRepository;
