const sql = require('../sql').service;
const {calcServiceDiff, calcClientDiff, extractServiceBoolean} = require('../../functions/helpers.js');
const {requiredDeployment} = require('../../functions/requiredDeployment.js');
const cs = {}; // Reusable ColumnSet objects.
var requested_attributes = require('../../tenant_config/requested_attributes.json')
/*
 This repository mixes hard-coded and dynamic SQL, primarily to show a diverse example of using both.
 */

class ServiceRepository {
  constructor(db, pgp) {
      this.db = db;
      this.pgp = pgp;
      // set-up all ColumnSet objects, if needed:
  }


  async get(id,tenant){
      return this.db.oneOrNone(sql.getService,{
          id:+id,
          tenant:tenant
        }).then(result => {
          if(result){
            let data = {};
            result.json.generate_client_secret = false;
            data.service_data = extractServiceBoolean(result.json);
            return data
          }
          else {
            return null;
          }
        });
  }

  async getContacts(data,tenant){
    const query = this.pgp.as.format(sql.getContacts,{...data,tenant:tenant});
    return this.db.any(query).then(users =>{
      if(users&&users[0]&&users[0].emails){
        return users[0].emails;
      }
      else{
        return [];
      }
    });
  }

  //TODO UPDATE
  async addClient(client, service_id, t) {
    let queries = [];
    const cd_result = await t.client_details.add(client, service_id);
    if (cd_result) {
      queries.push(t.client_details_protocol.add('client', client, cd_result.id));
      if (client.protocol === 'oidc') {
        queries.push(
            t.client_multi_valued.add('client', 'oidc_grant_types', client.grant_types, cd_result.id),
            t.client_multi_valued.add('client', 'oidc_scopes', client.scope, cd_result.id),
            t.client_multi_valued.add('client', 'oidc_redirect_uris', client.redirect_uris, cd_result.id),
            t.client_multi_valued.add('client', 'oidc_post_logout_redirect_uris', client.post_logout_redirect_uris, cd_result.id),
            t.client_state.add(cd_result.id, 'pending', 'create')
        );
      } else if (client.protocol === 'saml') {
        queries.push(t.client_multi_valued.addSamlAttributes('client', client.requested_attributes, cd_result.id));
      }
      await t.batch(queries);
    }
  }


  async add(service,requester,group_id) {
      try{
        let service_id;
        return this.db.tx('add-service',async t =>{

          service.group_id = group_id;
          const service_result = await t.service_details.add(service,requester);
          if (service_result) {
            service_id = service_result.id;
            const queries = [
                t.service_contacts.add('service', service.contacts, service_result.id),
                t.service_multi_valued.addServiceBoolean('service',service,service_result.id)
            ];
            await Promise.all(service.clients.map(client => this.addClient(client, service_result.id, t)));
            return t.batch(queries);
          }
        }).then(data => {
          return service_id;
        }).catch(stuff=>{
          throw 'error'
        });
      }
      catch(error){
        throw 'error'
      }
    }

  async update(newState,targetId,tenant){
    try{
      return this.db.tx('update-service',async t =>{
        let queries = [];
        return t.service.get(targetId,tenant).then(async oldState=>{
          if(oldState){
            let serviceEdits = calcServiceDiff(oldState.service_data,newState,tenant);
            // TODO UPDATE let startDeployment = requiredDeployment(oldState.service_data,newState);
            if(Object.keys(serviceEdits.details).length !== 0){
               queries.push(t.service_details.update(serviceEdits.details,targetId));
            }
            if(Object.keys(serviceEdits.update.service_boolean).length >0){
              queries.push(t.service_multi_valued.updateServiceBoolean('service',{...serviceEdits.update.service_boolean,tenant:tenant},targetId));
            }
            if(Object.keys(serviceEdits.add.service_boolean).length >0){
              queries.push(t.service_multi_valued.addServiceBoolean('service',{...serviceEdits.add.service_boolean,tenant:tenant},targetId));
            }
            for (var key in serviceEdits.add){
              if(key==='contacts') {
                queries.push(t.service_contacts.add('service',serviceEdits.add[key],targetId));
              } else {
                queries.push(t.service_multi_valued.add('service',key,serviceEdits.add[key],targetId));
              }
            }
            for (var key in serviceEdits.dlt){
              if(key==='contacts'){queries.push(t.service_contacts.delete_one_or_many('service',serviceEdits.dlt[key],targetId));}
              else {queries.push(t.service_multi_valued.delete_one_or_many('service',key,serviceEdits.dlt[key],targetId));}
            }

            //Client petitions update
            for (const client of newState.clients) {
              if (client.type === 'create') {
                await this.addClient(client, targetId, t);
              } else if (client.type === 'delete') {
                await t.client_details.delete(client.id);
              } else {
                return t.petition.getClientPetition(client.id).then(async clientOldState => {
                  let clientEdits = calcClientDiff(clientOldState,client,tenant);
                  if(Object.keys(clientEdits.details).length !== 0){
                    queries.push(t.client_details_protocol.update('client',clientEdits.details,targetId));
                  }
                  for (var key in clientEdits.add){
                    if(key==='requested_attributes'){queries.push(t.client_multi_valued.addSamlAttributes('client',clientEdits.add[key],targetId))}
                    else {queries.push(t.client_multi_valued.add('client',key,clientEdits.add[key],targetId));}
                  }
                  for (var key in clientEdits.update){
                    if(key==='requested_attributes'){queries.push(t.client_multi_valued.updateSamlAttributes('client',clientEdits.update[key],targetId))}}
                  for (var key in clientEdits.dlt){
                    if(key==='requested_attributes'){queries.push(t.client_multi_valued.deleteSamlAttributes('client',clientEdits.dlt[key],targetId))}
                    else {queries.push(t.client_multi_valued.delete_one_or_many('client',key,clientEdits.dlt[key],targetId));}
                  }
                });
              }
              //TODO START DEPLOYMENT ? queries.push(t.service_state.update(targetId,(startDeployment?'pending':'deployed'),'edit'));
              queries.push(t.client_state.update(targetId,('pending'),'edit'));
            }

            var result = await t.batch(queries);
            if(result){
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


  async getAll(tenant,filters,authorized){
    let filter_strings = {
      integration_environment_filter : "",
      protocol_id_filter: "",
      protocol_filter: "",
      client_all_properties_filter:"'oidc_client_id',cd.oidc_client_id,'external_id',cd.external_id,'allow_introspection',cd.allow_introspection,\
      'code_challenge_method',cd.code_challenge_method, 'device_code_validity_seconds',cd.device_code_validity_seconds,'application_type',cd.application_type,\
      'access_token_validity_seconds',cd.access_token_validity_seconds,'refresh_token_validity_seconds',cd.refresh_token_validity_seconds,'refresh_token_validity_seconds',cd.refresh_token_validity_seconds,'client_secret',cd.client_secret,\
      'reuse_refresh_token',cd.reuse_refresh_token,'jwks',cd.jwks,'jwks_uri',cd.jwks_uri,\
      'token_endpoint_auth_method',cd.token_endpoint_auth_method,'token_endpoint_auth_signing_alg',cd.token_endpoint_auth_signing_alg,\
      'clear_access_tokens_on_refresh',cd.clear_access_tokens_on_refresh,'id_token_timeout_seconds',cd.id_token_timeout_seconds,\
      'metadata_url',cd.metadata_url,'entity_id',cd.entity_id,\
      'grant_types',(SELECT json_agg((v.value)) FROM service_oidc_grant_types v WHERE cd.id = v.owner_id),\
      'scope',(SELECT json_agg((v.value)) FROM service_oidc_scopes v WHERE cd.id = v.owner_id),\
      'requested_attributes',(SELECT coalesce(json_agg(json_build_object('friendly_name',v.friendly_name,'name',v.name,'required',v.required,'name_format',v.name_format)), '[]'::json) FROM service_saml_attributes v WHERE cd.id=v.owner_id),\
      'redirect_uris',(SELECT json_agg((v.value)) FROM service_oidc_redirect_uris v WHERE cd.id = v.owner_id),'post_logout_redirect_uris',(SELECT json_agg((v.value)) FROM service_oidc_post_logout_redirect_uris v WHERE cd.id = v.owner_id),",
      tags_filter:"",
      exclude_tags_filter:""
    }
    if(filters.tags){
      filter_strings.tags_filter= "AND ("
      filters.tags.forEach((tag,index)=>{
        if(index>0){
          filter_strings.tags_filter = filter_strings.tags_filter + " OR"
        }
        filter_strings.tags_filter = filter_strings.tags_filter + " '"+ tag +"' = ANY(tags)"
      })
      filter_strings.tags_filter = filter_strings.tags_filter + ')'
    }
    if(filters.integration_environment){
      filter_strings.integration_environment_filter = "AND integration_environment='" + filters.integration_environment+ "'";
    }
    if(filters.exclude_tags){
      filter_strings.exclude_tags_filter= "AND NOT ("
      filters.exclude_tags.forEach((tag,index)=>{
        if(index>0){
          filter_strings.exclude_tags_filter = filter_strings.exclude_tags_filter + " OR"
        }
        filter_strings.exclude_tags_filter = filter_strings.exclude_tags_filter + " '"+ tag +"' = ANY(tags)"
      })
      filter_strings.exclude_tags_filter = filter_strings.exclude_tags_filter + ')'
    }
    if(filters.protocol){
      filter_strings.protocol_filter = "AND protocol='" + filters.protocol+ "'";
    }
    if(!authorized){
      filter_strings.client_all_properties_filter = ""
    }
    if(filters.protocol_id){
      filter_strings.protocol_id_filter = "WHERE cd.entity_id='"+ filters.protocol_id + "' OR cd.oidc_client_id='" +filters.protocol_id+ "')"
    }
    const query = this.pgp.as.format(sql.getAll,{tenant:tenant,...filter_strings});
    return await this.db.any(query).then(services=>{
      if(services){
        const res = [];
        for (let i = 0; i < services.length; i++) {
          res.push(services[i].json);
        }
        return res;
      }
      else{
        return null;
      }
    });
  }



  async getWithPendingClients(){
    const query = this.pgp.as.format(sql.getWithPendingClients);
    return this.db.any(query).then(services=>{
      services.forEach((service,service_index)=>{
        service.json.clients.forEach((client, client_index) => {
          if(client.protocol==='saml'&&client.requested_attributes&&client.requested_attributes.length>0){
            client.requested_attributes.forEach((attribute,attr_index)=>{
              let match_index = requested_attributes.findIndex(x => x.friendly_name ===attribute.friendly_name)
              if(requested_attributes[match_index].name===attribute.name){
                services[service_index].json.clients[client_index].requested_attributes[attr_index].type = "standard";
              }else{
                services[service_index].json.clients[client_index].requested_attributes[attr_index].type = "custom";
              }
            })
          }
        })
      })
      if(services){
        return services;
      }
      else{
        return null;
      }
    });
  }
}






//////////////////////////////////////////////////////////
// Example of statically initializing ColumnSet objects:



module.exports = ServiceRepository;
