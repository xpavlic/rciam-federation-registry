var router = require('express').Router({ mergeParams: true });
var axios = require('axios');
var https = require('https');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var convert = require('xml-js');
var default_supported_attributes = require('../tenant_config/requested_attributes.json')


parser.on('error', function(err) { console.log('Parser error', err); });
router.get('/metadata_info',async (req,res,next)=>{
    try{
      let url = decodeURIComponent(req.query.metadata_url);
      axios.get(url,{timeout:2000})
      .then(response => {
        let data = response.data;
        if(data){
          try{
            result = convert.xml2js(data, {compact: true, spaces: 4});
            // res.status(200).send(result);
          }
          catch(err){             
            res.statusMessage = "Could not load XML from Metadata Url."
            res.status(404).send();
          }
        }
        else{
          res.statusMessage = "Could not load XML from Metadata Url."
          res.status(404).send();
        }
        try{
          if(result){
            let ns = extractNamespace(result);
            let entity_id, requested_attributes;
            let assertion_consumer_service, single_logout_service, signing_cert;
            let supported_attributes=[];
            let unsupported_attributes= [];
            if(!(result.hasOwnProperty(ns+'EntityDescriptor')&&result[ns+'EntityDescriptor'].hasOwnProperty(ns+'SPSSODescriptor'))){
              res.statusMessage = "XML contained in the metadata is not Valid."
              res.status(404).send();
            }
            try{               
              entity_id=result[ns+'EntityDescriptor']['_attributes'].entityID;  
            }
            catch(err){
              console.log(err);
            };
            try{
              const spDescriptor = result[ns+'EntityDescriptor'][ns+'SPSSODescriptor'];
              const assertionConsumerServices = toArray(spDescriptor[ns+'AssertionConsumerService']);
              const logoutServices = toArray(spDescriptor[ns+'SingleLogoutService']);
              const keyDescriptors = toArray(spDescriptor[ns+'KeyDescriptor']);

              const assertionConsumer = assertionConsumerServices.find((item)=>item && item._attributes && item._attributes.Location) || assertionConsumerServices[0];
              assertion_consumer_service = assertionConsumer && assertionConsumer._attributes ? assertionConsumer._attributes.Location : null;

              const logoutService = logoutServices.find((item)=>item && item._attributes && item._attributes.Location) || logoutServices[0];
              single_logout_service = logoutService && logoutService._attributes ? logoutService._attributes.Location : null;

              const signingKeyDescriptor = keyDescriptors.find((item)=>item && item._attributes && item._attributes.use === 'signing') || keyDescriptors[0];
              signing_cert = signingKeyDescriptor && signingKeyDescriptor[ns+'KeyInfo'] && signingKeyDescriptor[ns+'KeyInfo'][ns+'X509Data'] && signingKeyDescriptor[ns+'KeyInfo'][ns+'X509Data'][ns+'X509Certificate']
                ? normalizeCertificate(signingKeyDescriptor[ns+'KeyInfo'][ns+'X509Data'][ns+'X509Certificate']._text)
                : null;
            }
            catch(err){}
            try{
              requested_attributes = result[ns+'EntityDescriptor'][ns+'SPSSODescriptor'][ns+'AttributeConsumingService'][ns+'RequestedAttribute'];                 
              if(requested_attributes&&requested_attributes.length>0){
                requested_attributes.forEach((attribute,index)=>{
                  requested_attributes[index] = {
                    friendly_name:requested_attributes[index]._attributes.FriendlyName,
                    name:requested_attributes[index]._attributes.Name,
                    required:!!requested_attributes[index]._attributes.isRequired,
                    name_format:requested_attributes[index]._attributes.NameFormat
                  }
                });
                supported_attributes = requested_attributes.filter(e=> default_supported_attributes.some(x=>x.name===e.name));
                unsupported_attributes = requested_attributes.filter(e=> default_supported_attributes.every(x=>x.name!==e.name));
              }
            }
            catch(err){}
            res.status(200).send({
              entity_id,
              assertion_consumer_service,
              single_logout_service,
              signing_cert,
              supported_attributes:supported_attributes,
              unsupported_attributes:unsupported_attributes,
              metadata_url:url
            });
          }  
        }
        catch(err){
          console.log(err);
          res.statusMessage = "Could not load Service properties from Metadata Url."
          res.status(404).send();
        }
      }).catch(err =>{
        res.statusMessage = "Could not get response from Metadata Url"
        res.status(404).end();
      } 
        
        );


    }
    catch(err){
      res.statusMessage = "Could not get response from Metadata Url"
      res.status(404).send();
    }

  })



function extractNamespace(xml) {
  let regex = /^(.*):EntityDescriptor/g; 
  let match;

  for (var attribute in xml) {
    match = !match&&regex.exec(attribute)
  }
  if(match&&match[1]){
    return match[1]+":";
  }
  else{
    return "";
  }
};

function toArray(value){
  if(!value){
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeCertificate(value){
  if(!value){
    return null;
  }
  const cert = value.replace(/\s+/g, '');
  if(!cert){
    return null;
  }
  return '-----BEGIN CERTIFICATE-----\n' + cert.match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----';
}
  


module.exports = router;