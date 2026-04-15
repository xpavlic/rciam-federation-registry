var config = require('../config');
var diff = require('deep-diff').diff;
const {getLocalizedPolicyUrlField, withLocalizedPolicyAliases} = require('./localizedFields');

function requiredDeployment(old_values,new_values){
  let deploy = false;

  const changes = diff(old_values,new_values);

  let helper = {
    grant_types: {
      D:[],
      N:[],
    },
    scope: {
      D:[],
      N:[]
    },
    contacts: {
      D:[],
      N:[]
    },
    redirect_uris: {
      D:[],
      N:[]
    },
    post_logout_redirect_uris: {
      D:[],
      N:[]
    },
    service_policies: {
      D:[],
      N:[]
    }
  };

  for(let i=0;i<changes.length;i++){
    if(! config.multivalue_fields.includes(changes[i].path[0])){
        helper[changes[i].path[0]]=changes[i].kind;
      }
  }
  helper = calculateMultivalueDiff(old_values,new_values,helper);
  for(property in helper){
    if(config.deployment_fields.includes(property)){
      deploy = true;
    }
  }
  return deploy;
}


  

  function calculateMultivalueDiff(old_values,new_values,edits){
    const localizedPolicyUrlField = getLocalizedPolicyUrlField();
    let new_cont = [];
    let old_cont = [];
    let items;
    if(!old_values.contacts){
      old_values.contacts = [];
    }
    if(!new_values.contacts){
      new_values.contacts = [];
    }
  
    new_values.contacts.forEach(item=>{
      new_cont.push(item.email+' '+item.type);
    });
    old_values.contacts.forEach(item=>{
      old_cont.push(item.email+' '+item.type);
    });
    edits.contacts.N = new_cont.filter(x=>!old_cont.includes(x));
    edits.contacts.D = old_cont.filter(x=>!new_cont.includes(x));
    if(edits.contacts.D.length>0){
        edits.contacts.D.forEach((item,index)=>{
          items = item.split(' ');
          edits.contacts.D[index] = {email:items[0],type:items[1]};
        })
    }
    if(edits.contacts.N.length>0){
        edits.contacts.N.forEach((item,index)=>{
          items = item.split(' ');
          edits.contacts.N[index] = {email:items[0],type:items[1]};
      })
    }

    if(!old_values.service_policies){
      old_values.service_policies = [];
    }
    if(!new_values.service_policies){
      new_values.service_policies = [];
    }
    const oldPolicies = old_values.service_policies.map((item)=>{
      const normalizedPolicy = withLocalizedPolicyAliases({...item});
      const localizedUrl = normalizedPolicy[localizedPolicyUrlField] || normalizedPolicy.url;
      return normalizedPolicy.name + '|||' + normalizedPolicy.url + '|||' + localizedUrl;
    });
    const newPolicies = new_values.service_policies.map((item)=>{
      const normalizedPolicy = withLocalizedPolicyAliases({...item});
      const localizedUrl = normalizedPolicy[localizedPolicyUrlField] || normalizedPolicy.url;
      return normalizedPolicy.name + '|||' + normalizedPolicy.url + '|||' + localizedUrl;
    });
    edits.service_policies.N = newPolicies.filter(x=>!oldPolicies.includes(x)).map((item)=>{
      const values = item.split('|||');
      return {name: values[0], url: values[1], [localizedPolicyUrlField]: values[2] || values[1]};
    });
    edits.service_policies.D = oldPolicies.filter(x=>!newPolicies.includes(x)).map((item)=>{
      const values = item.split('|||');
      return {name: values[0], url: values[1], [localizedPolicyUrlField]: values[2] || values[1]};
    });

    if(new_values.protocol==='oidc'){
      if(!old_values.redirect_uris){
        old_values.redirect_uris = [];
      }
      if(!new_values.redirect_uris){
        new_values.redirect_uris = [];
      }
      if(!old_values.post_logout_redirect_uris){
        old_values.post_logout_redirect_uris = [];
      }
      if(!new_values.post_logout_redirect_uris){
        new_values.post_logout_redirect_uris = [];
      }
      if(!old_values.scope){
        old_values.scope = [];
      }
      if(!new_values.scope){
        new_values.scope = [];
      }
      if(!old_values.grant_types){
        old_values.scope = [];
      }
      if(!new_values.grant_types){
        new_values.scope = [];
      }
      edits.grant_types.N = new_values.grant_types.filter(x=>!old_values.grant_types.includes(x));
      edits.grant_types.D = old_values.grant_types.filter(x=>!new_values.grant_types.includes(x));

      edits.scope.N = new_values.scope.filter(x=>!old_values.scope.includes(x));
      edits.scope.D = old_values.scope.filter(x=>!new_values.scope.includes(x));

      edits.redirect_uris.N = new_values.redirect_uris.filter(x=>!old_values.redirect_uris.includes(x));
      edits.redirect_uris.D = old_values.redirect_uris.filter(x=>!new_values.redirect_uris.includes(x));
      edits.post_logout_redirect_uris.N = new_values.post_logout_redirect_uris.filter(x=>!old_values.post_logout_redirect_uris.includes(x));
      edits.post_logout_redirect_uris.D = old_values.post_logout_redirect_uris.filter(x=>!new_values.post_logout_redirect_uris.includes(x));

      


    }
    if(edits.scope&&edits.scope.N.length===0&&edits.scope.D.length===0){
      delete edits.scope;
    }
    if(edits.grant_types&&edits.grant_types.N.length===0&&edits.grant_types.D.length===0){
      delete edits.grant_types;
    }
    if(edits.redirect_uris&&edits.redirect_uris.N.length===0&&edits.redirect_uris.D.length===0){
      delete edits.redirect_uris;
    }
    if(edits.post_logout_redirect_uris&&edits.post_logout_redirect_uris.N.length===0&&edits.post_logout_redirect_uris.D.length===0){
      delete edits.post_logout_redirect_uris;
    }

    if(edits.contacts&&edits.contacts.N.length===0&&edits.contacts.D.length===0){
      delete edits.contacts;
    }
    if(edits.service_policies&&edits.service_policies.N.length===0&&edits.service_policies.D.length===0){
      delete edits.service_policies;
    }
    if(edits.redirect_uris&&edits.redirect_uris.N.length===0&&edits.redirect_uris.D.length===0){
      delete edits.redirect_uris;
    }
    if(edits.post_logout_redirect_uris&&edits.post_logout_redirect_uris.N.length===0&&edits.post_logout_redirect_uris.D.length===0){
      delete edits.post_logout_redirect_uris;
    }
    return edits
  }


  module.exports = {
    requiredDeployment
  }