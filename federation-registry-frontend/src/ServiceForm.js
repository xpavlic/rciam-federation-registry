import React,{useState,useEffect,useContext,useRef} from 'react';
import mapValues from 'lodash/mapValues';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faCheckCircle,faBan,faSortDown,faExclamationTriangle,faPen} from '@fortawesome/free-solid-svg-icons';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyDialog from './Components/CopyDialog.js'
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Row from 'react-bootstrap/Row';
import {ProcessingRequest} from './Components/LoadingBar';
import Col from 'react-bootstrap/Col';
import Collapse from 'react-bootstrap/Collapse';
import {useParams } from "react-router-dom";
import { diff } from 'deep-diff';
import {tenantContext} from './context.js';
import Alert from 'react-bootstrap/Alert';
// import {Debug} from './Components/Debug.js';
import {SimpleModal,Logout,NotFound,PetitionSubmittedModal} from './Components/Modals.js';
import Form from 'react-bootstrap/Form';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Formik} from 'formik';
import config from './config.json';
import InputRow from './Components/InputRow.js';
import Button from 'react-bootstrap/Button';
import ManageTags from './Components/ManageTags.js';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import parse from 'html-react-parser';
import countryData from 'country-region-data';
import {SimpleInput,CountrySelect,SelectEnvironment,DeviceCode,Select,ListInput,LogoInput,TextAria,CheckboxList,SimpleCheckbox,TimeInput,Contacts,ServicePolicies,OrganizationField,SimpleRadio,MetadataInput, Checkbox} from './Components/Inputs.js'// eslint-disable-next-line
import AccessControlTab from './Components/AccessControlTab';
import ManagersTab from './Components/ManagersTab';
import MoveDialog from "./Components/MoveDialog";
import { ConfirmationModal } from './Components/Modals.js';




const {reg} = require('./regex.js');
var availabilityCheckTimeout;
var urlCheckTimeout;
var urlCheckTimeoutResponse;
var countries;
let integrationEnvironment;
let application_type;
let timeouts = {};

// Updated by Jan Pavlíček (xpavli95@stud.fit.vutbr.cz) - to show move dialog instead of copy dialog when clicking
// the button next to the integration environments box.
const ServiceForm = (props)=> {
  let serviceMoveEnabled = false;
  if ('merge_environments_on_deploy' in config && config.merge_environments_on_deploy) {
    serviceMoveEnabled = true;
  }

  // eslint-disable-next-line
  const { t, i18n } = useTranslation();
  let {tenant_name} = useParams();
  let {service_id} = useParams();
  let {petition_id} = useParams();
  const [notFound,setNotFound] = useState(false);
  const [restrictReview,setRestrictReview] = useState(false);
  // eslint-disable-next-line
  const [tenant,setTenant] = useContext(tenantContext);
  const [logout,setLogout] = useState(false);
  const [submitDisabled,setSubmitDisabled] = useState(false);
  const [availabilityCheck,setAvailabilityCheck] = useState(true);
  const formRef = useRef();
  const [disabled,setDisabled] = useState(false);
  const [disabledOrganizationFields,setDisabledOrganizationFields] = useState([]);
  const [hasSubmitted,setHasSubmitted] = useState(false);
  const [metadataWarning,setMetadataWarning] = useState();
  const [metadataLoaded,setMetadataLoaded] = useState({
    supported_attributes:[],
    unsupported_attributes:[],
    entity_id:null,
    metadata_url:null,
    assertion_consumer_service:null,
    single_logout_service:null,
    signing_cert:null
  });
  const [metadataAsyncError,setMetadataAyncError] = useState("");
  const [metadataChecked,setMetadataChecked] = useState();
  const [metadataLoading,setMetadataLoading] = useState(false)
  const [checkingAvailability,setCheckingAvailability] = useState(false);
  const [checkedId,setCheckedId] = useState(); // Variable containing the last client Id checked for availability to limit check requests
 // const [loadedMetadata,setLoadedMetadata] = useState(); // Variable containing the last loaded metadata url
  const [checkedEnvironment,setCheckedEnvironment] = useState();
  const [asyncResponse,setAsyncResponse] = useState(false);
  const [formValues,setFormValues] = useState();
  const [showCopyDialog,setShowCopyDialog] = useState(false);
  const [showMoveDialog,setShowMoveDialog] = useState(false);
  const [showInitErrors,setShowInitErrors] = useState(false);
  const [logoWarning,setLogoWarning] = useState(false);
  const [serviceTags,setServiceTags] = useState([]);
  const [manageTags,setManageTags] = useState(false);
  const [timeoutId] = useState(hex(4));
  const [modalData,setModalData] = useState({});
  const policyTypeOptions = tenant?.form_config?.service_policy_types || [];
  const policyTypeValues = policyTypeOptions.map((policy)=>policy.value);
  const infrastructureTermUrls = tenant?.form_config?.infrastructure_terms || {};
  const oidcUiConfig = tenant?.form_config?.oidc_ui || {};
  const deprecatedGrantTypes = tenant?.form_config?.grant_types_deprecated || [];
  const oidcGrantTypeOptions = oidcUiConfig.grant_types || (tenant?.form_config?.grant_types || []).filter((grantType)=>!deprecatedGrantTypes.includes(grantType));
  const oidcTokenEndpointMethodOptions = oidcUiConfig.token_endpoint_auth_method || tenant?.form_config?.token_endpoint_auth_method || [];
  const oidcTokenEndpointMethodTitles = oidcUiConfig.token_endpoint_auth_method_title || oidcTokenEndpointMethodOptions.map((method)=> {
    const methodIndex = (tenant?.form_config?.token_endpoint_auth_method || []).indexOf(method);
    if(methodIndex >= 0 && Array.isArray(tenant?.form_config?.token_endpoint_auth_method_title)){
      return tenant.form_config.token_endpoint_auth_method_title[methodIndex];
    }
    return method;
  });
  const rawPkceOptions = oidcUiConfig.code_challenge_method || tenant?.form_config?.code_challenge_method || [null, 'plain', 'S256'];
  const oidcPkceOptions = rawPkceOptions.map((item)=>item===null?'':item);
  const oidcPkceTitles = oidcUiConfig.code_challenge_method_title || oidcPkceOptions.map((item)=>{
    if(item === 'S256') return 'SHA256 Code Challenge';
    if(item === 'plain') return 'Plain Code Challenge';
    return 'None';
  });
  const oidcScopeOptions = oidcUiConfig.scope || tenant?.form_config?.scope || [];
  const oidcDefaultScopes = oidcUiConfig.default_scopes || tenant?.client_scopes || ['openid', 'profile', 'email'];
  const oidcResourceIndicatorsEnabled = oidcUiConfig.resource_indicators_enabled !== false;

  const normalizePolicyValues = (policies)=>{
    if(!Array.isArray(policies)){
      return [];
    }
    return policies
      .filter((item)=>item && typeof item.name === 'string' && typeof item.url === 'string')
      .map((item)=>({
        name: item.name,
        url: item.url,
        url_czech: typeof item.url_czech === 'string' && item.url_czech ? item.url_czech : item.url
      }));
  };

  const splitPolicyValuesForForm = (policies)=>{
    const normalized = normalizePolicyValues(policies);
    return {
      service_policies: normalized.map((item)=>({name: item.name, url: item.url})),
      service_policies_czech: normalized.map((item)=>({name: item.name, url: item.url_czech}))
    };
  };

  const mergePolicyValuesForApi = (englishPolicies, czechPolicies)=>{
    const englishByType = {};
    const czechByType = {};

    normalizePolicyValues(englishPolicies).forEach((item)=>{
      englishByType[item.name] = item.url;
    });
    normalizePolicyValues(czechPolicies).forEach((item)=>{
      czechByType[item.name] = item.url;
    });

    const policyTypes = Array.from(new Set([...Object.keys(englishByType), ...Object.keys(czechByType)]));
    return policyTypes
      .map((name)=>{
        const url = englishByType[name] || czechByType[name];
        const url_czech = czechByType[name] || englishByType[name];
        return {name, url, url_czech};
      })
      .filter((item)=>item.name && item.url);
  };

  const hasSamePolicyTypes = (firstList, secondList)=>{
    const first = (Array.isArray(firstList) ? firstList : []).map((item)=>item?.name).filter(Boolean).sort();
    const second = (Array.isArray(secondList) ? secondList : []).map((item)=>item?.name).filter(Boolean).sort();
    if(first.length !== second.length){
      return false;
    }
    return first.every((value,index)=>value === second[index]);
  };

  useEffect(()=>{
    //Get tags 
    if(props.user.actions.includes('manage_tags')&&service_id){
      getTags();
    }

    countries = [];
    if(service_id||petition_id){
      setShowInitErrors(true)
    }

    if(!tenant.form_config.integration_environment.includes(props.initialValues.integration_environment)){
      props.initialValues.integration_environment = tenant.form_config.integration_environment[0];
    }

    if (props.move_service && props.integration_environment) {
      props.initialValues.integration_environment = props.integration_environment;
    }

    countryData.forEach((item,index)=>{
      countries.push(item.countryShortCode.toLowerCase());

    });
        if(props.disabled||props.review){
        setDisabled(true);
    }
    let extra_fields =tenant.form_config.extra_fields;
    Object.keys(extra_fields).forEach((name,index)=>{
      if(!Object.keys(props.initialValues).includes(name)){
        props.initialValues[name]= extra_fields[name].default;
      }
    });

    // Check restrictions for review
    if(props.review){
      if(tenant.restricted_environments.includes(props.initialValues.integration_environment)&&!props.user.actions.includes('review_restricted')){
        setRestrictReview(true);
      }
    }
    if(props.initialValues.organization_name){
      setDisabledOrganizationFields(['organization_url']);
    }

    if(!Array.isArray(props.initialValues.rp_blocked_idps_desc)){
      props.initialValues.rp_blocked_idps_desc = [];
    }
    if(!Array.isArray(props.initialValues.rp_only_allowed_idps_desc)){
      props.initialValues.rp_only_allowed_idps_desc = [];
    }
    if(typeof(props.initialValues.check_group_membership) !== 'boolean'){
      props.initialValues.check_group_membership = false;
    }
    if(typeof(props.initialValues.require_vo_membership) !== 'boolean'){
      props.initialValues.require_vo_membership = false;
    }
    if(typeof(props.initialValues.require_group_membership) !== 'boolean'){
      props.initialValues.require_group_membership = false;
    }
    if(typeof(props.initialValues.create_group) !== 'boolean'){
      props.initialValues.create_group = false;
    }
    if(typeof(props.initialValues.allow_registration) !== 'boolean'){
      props.initialValues.allow_registration = false;
    }
    if(typeof(props.initialValues.dynamic_registration) !== 'boolean'){
      props.initialValues.dynamic_registration = false;
    }
    if(!props.initialValues.rp_ensure_membership_desc){
      props.initialValues.rp_ensure_membership_desc = '';
    }
    if(!props.initialValues.rp_ensure_group_membership_desc){
      props.initialValues.rp_ensure_group_membership_desc = '';
    }
    if(!props.initialValues.registration_url){
      props.initialValues.registration_url = '';
    }

    const splitPolicies = splitPolicyValuesForForm(props.initialValues.service_policies);
    props.initialValues.service_policies = splitPolicies.service_policies;
    if(Array.isArray(props.initialValues.service_policies_czech) && props.initialValues.service_policies_czech.length > 0){
      props.initialValues.service_policies_czech = normalizePolicyValues(props.initialValues.service_policies_czech)
        .map((item)=>({name: item.name, url: item.url}));
    }
    else{
      props.initialValues.service_policies_czech = splitPolicies.service_policies_czech;
    }

    if(props.initialValues.protocol === 'oidc'){
      if(!Array.isArray(props.initialValues.resource_indicators)){
        props.initialValues.resource_indicators = [];
      }
      if(!Array.isArray(props.initialValues.grant_types)){
        props.initialValues.grant_types = [];
      }
      props.initialValues.grant_types = props.initialValues.grant_types.filter((grantType)=>oidcGrantTypeOptions.includes(grantType));
      if(!oidcTokenEndpointMethodOptions.includes(props.initialValues.token_endpoint_auth_method)){
        props.initialValues.token_endpoint_auth_method = 'client_secret_basic';
      }
      if(!oidcPkceOptions.includes(props.initialValues.code_challenge_method || '')){
        props.initialValues.code_challenge_method = '';
      }
      if(!Array.isArray(props.initialValues.scope)){
        props.initialValues.scope = [];
      }
      if(!(service_id||petition_id) && props.initialValues.scope.length === 0){
        props.initialValues.scope = oidcScopeOptions.filter((scopeItem)=>oidcDefaultScopes.includes(scopeItem));
      }
    }

    if(props.initialValues.protocol === 'saml'){
      const samlUiConfig = tenant?.form_config?.saml_ui || {};
      const defaultSamlAttributes = samlUiConfig.default_attributes || ['openid', 'profile', 'email'];
      if(!Array.isArray(props.initialValues.required_attributes)){
        props.initialValues.required_attributes = [...defaultSamlAttributes];
      }
      if(typeof props.initialValues.assertion_consumer_service !== 'string'){
        props.initialValues.assertion_consumer_service = '';
      }
      if(typeof props.initialValues.single_logout_service !== 'string'){
        props.initialValues.single_logout_service = '';
      }
      if(typeof props.initialValues.signing_cert !== 'string'){
        props.initialValues.signing_cert = '';
      }
    }

    setFormValues(props.initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[props.initialValues]);


  // Returns true
  yup.addMethod(yup.array, 'unique', function(message, mapper = a => a) {
      return this.test('unique', message, function(list) {
        if(list){
          return list.length  === new Set(list.map(mapper)).size;
        }
        else{
          return true;
        }
      });
  });
  function imageExists(url) {
    if(url){
      var img = new Image();
      img.onload = function() { setLogoWarning(false); };
      img.onerror = function() { setLogoWarning(true); };
      img.src = url;

    }
    else{
      setLogoWarning(false);
    }
  }

  const dynamicValidation = async (values,props)=>{
    let error = {};
    lazy_schema.validate(values,{abortEarly:false}).catch(function (err) {
      if(err.inner){
        err.inner.forEach(item=>{
          error[item.path] = item.message;
        })
      }
    });
    return error;
  }


  const getMetadata = async (value,resolve,setRequestedAttributes)=>{
    setMetadataLoading(true);
    setMetadataAyncError();
    setMetadataChecked(value);
    let loadMetadata = !(metadataChecked!==value&&value!==metadataLoaded.metadata_url&&value!==props.initialValues.metadataUrl)||setRequestedAttributes
    clearTimeout(timeouts[timeoutId])
    timeouts[timeoutId] = setTimeout(()=> {
      fetch(config.host[tenant_name]+'util/metadata_info?metadata_url='+encodeURIComponent(value), {
        method:'GET',
        credentials:'include',
        headers:{
          'Content-Type':'application/json'
        }}).then(async response=>{
          if(response.status===200||response.status===304){
            let metadata = await response.json();
            if(formRef.current){
              if(metadata.entity_id){
                formRef.current.setFieldValue('entity_id',metadata.entity_id,false);
              }
              if(metadata.assertion_consumer_service){
                formRef.current.setFieldValue('assertion_consumer_service',metadata.assertion_consumer_service,false);
              }
              if(metadata.single_logout_service){
                formRef.current.setFieldValue('single_logout_service',metadata.single_logout_service,false);
              }
              if(metadata.signing_cert){
                formRef.current.setFieldValue('signing_cert',metadata.signing_cert,false);
              }
            }
            if(tenant.form_config.more_info.requested_attributes&&!tenant.form_config.more_info.requested_attributes.disabled){
              loadMetadata&&setMetadataLoaded(metadata);
              if(metadata.supported_attributes.length===0&&!metadata.entity_id){
                if(!resolve){
                  setRequestedAttributes(tenant.form_config.requested_attributes);
                }
                setMetadataWarning('Could not find an Entity Id or any Requested Attributes from this Metadata Url.');
              }
              else if(metadata.supported_attributes.length===0){
                if(!resolve){
                  setRequestedAttributes(tenant.form_config.defaultValues.requested_attributes);
                }
                setMetadataWarning('Could not find any Requested Attributes from this Metadata Url.');                
              }
              else if(!metadata.entity_id){
                setMetadataWarning('Could not find an Entity Id from this Metadata Url.');                
              }
            }
            else{
              if(!resolve){
                setRequestedAttributes(tenant.form_config.defaultValues.requested_attributes);
              }
              metadata.supported_attributes = [];
              
              loadMetadata&&setMetadataLoaded(metadata);
            }
          }
          else {
            if(!resolve){
              setRequestedAttributes(tenant.form_config.defaultValues.requested_attributes);              
            }
            setMetadataAyncError(response.statusText);
          }
          setMetadataLoading(false);          
        }).catch(()=>{
          setMetadataLoading(false);
          setMetadataAyncError("Could not get response from Metadata Url");          
          if(resolve){
            resolve(true)  
          }
          });
    },2000);
  }


  const lazy_schema  = yup.lazy(obj => yup.object(
    mapValues(obj, (v, k) => {
      if (Object.keys((tenant.form_config.extra_fields)).includes(k) && tenant.form_config.extra_fields[k].type==='boolean') {        
        return yup.boolean().required(t('yup_required')).when('integration_environment',{
          is:(integration_environment)=> {return tenant.form_config.extra_fields[k].required.includes(integration_environment)},
          then: yup.boolean().oneOf([true],tenant.form_config.extra_fields[k].error)
          })
      }
      else if(Object.keys((tenant.form_config.extra_fields)).includes(k) && k ==='aup_uri'){
        return yup.string().nullable().test('testAvailable',t('yup_url'),function(value){
            if(!value){
              return true
            }
            else{
              return value.match(reg.regSimpleUrl)
            }
        }).when('integration_environment',{
          is:(integration_environment)=> tenant.form_config.extra_fields[k].required.includes(integration_environment),
          then: yup.string().nullable().required(t('yup_required'))
          })
      }
    })
  ));

  const policySchema = yup.object().shape({
    name:yup.string().nullable().required(t('yup_required')).test('testPolicyTypeValue','Invalid policy type',function(value){
      if(policyTypeValues.length === 0){
        return true;
      }
      return policyTypeValues.includes(value);
    }),
    url:yup.string().nullable().required(t('yup_required')).matches(reg.regSimpleUrl,t('yup_url'))
  });

  const schema = yup.object({
    service_name:yup.string().nullable().min(4,t('yup_char_min') + ' ('+4+')').max(55,t('yup_char_max') + ' ('+55+')').required(t('yup_required')),
    service_name_czech:yup.string().nullable().min(4,t('yup_char_min') + ' ('+4+')').max(55,t('yup_char_max') + ' ('+55+')').required(t('yup_required')),
    // Every time client_id changes we make a fetch request to see if it is available.
    policy_uri:yup.string().nullable().when('integration_environment',{
      is:(integrationEnvironment)=> tenant.form_config.more_info.policy_uri?.required?.includes(integrationEnvironment),
      then: yup.string().nullable().required(t('yup_required')).matches(reg.regSimpleUrl,t('yup_url')),
      otherwise: yup.string().nullable().matches(reg.regSimpleUrl,t('yup_url'))
      }),
    service_login_url:yup.string().nullable().required(t('yup_required')).matches(reg.regSimpleUrl,t('yup_url')),
    service_login_url_czech:yup.string().nullable().required(t('yup_required')).matches(reg.regSimpleUrl,t('yup_url')),
    client_id:yup.string().nullable().when('protocol',{
      is:'oidc',
      then: yup.string().nullable().test('testClientIdFormat','Client Id can contain only numbers, letters and the special characters  "$-_.+!*\'(),"',function(value){
        if(!value){
          return true;
        }
        if(value.length < 2){
          return this.createError({ message: t('yup_char_min') + ' (' + 2 + ')' });
        }
        if(value.length > 128) {
          return this.createError({ message: t('yup_char_max') + ' (' + 128 + ')' });
        }
        return reg.regClientId.test(value);
      }).test('testAvailable',t('yup_client_id_available'),function(value){
        if(props.initialValues.client_id===value && !props.copy){
          return true
        }
        else{
          return new Promise((resolve,reject)=>{
              clearTimeout(availabilityCheckTimeout);
              if(!value)
                {resolve(true)}
              else{
                if(value===checkedId &&formRef.current.values.integration_environment===checkedEnvironment){
                  resolve(availabilityCheck);
                }
                else{
                  setCheckingAvailability(true);
                  availabilityCheckTimeout = setTimeout(()=> {
                    fetch(config.host[tenant_name]+'tenants/'+tenant_name+'/check-availability?value='+ value +'&protocol=oidc&environment='+ this.parent.integration_environment+(petition_id?('&petition_id='+petition_id):"")+(service_id?('&service_id='+service_id):""), {
                      method:'GET',
                      credentials:'include',
                      headers:{
                        'Content-Type':'application/json'
                      }}).then(response=>{
                        if(response.status===200||response.status===304){
                          return response.json();
                        }
                        else {
                          return false
                        }
                      }).then(response=>{
                          setCheckedId(value);
                          setCheckingAvailability(false);
                          setCheckedEnvironment(this.parent.integration_environment);
                          if(response){
                            setCheckedId(value);
                            setAvailabilityCheck(response.available);
                            resolve(response.available)}
                          else{
                            resolve(false);
                          }
                        }
                      ).catch(()=>{resolve(true)});
                  },1000);
                }
              }
            })
        }  
      })
    }),
    redirect_uris:yup.array().nullable().when('protocol',{
      is:'oidc',
      then: yup.array().nullable().when('integration_environment',(integration_environment)=>{
        integrationEnvironment = integration_environment;
      }).when('application_type',(application_type_value)=>{application_type = application_type_value;}).of(yup.string().required("Uri can't be an empty string").test('test_redirect_uri','Invalid Redirect Uri',function(value){
        if(value){
          let url;
          if (tenant?.config?.test_env.includes(integrationEnvironment)) {
            let isLocalIp = reg.regIpv4Local.test(value) || reg.regIpv6Local.test(value);
            if (isLocalIp) {
                return true;
            }
          }
          try {
            url = new URL(value);
          } catch (err) {
            return this.createError({ message: "Invalid uri" });  
          }
          if(value.includes('#')){
            return this.createError({ message: "Uri can't contain fragments" });
          }
          if(application_type==='WEB'){
            if(!tenant?.config?.test_env.includes(integrationEnvironment)&& url){
              if(url.protocol !== 'https:'&&!(url.protocol==='http:'&&url.hostname==='localhost')){
                return this.createError({ message: "Uri must be a secure url starting with https://" });              
              }
              
            }
            else{
              if(url&&!(url.protocol==='http:'||url.protocol==='https:')){
                return this.createError({ message: "Uri must be a url starting with http(s):// " });                              
              }
            }
          }
          else{
            // eslint-disable-next-line
            if(url.protocol==="javascript:"){
              return this.createError({ message: "Uri can't be of schema 'javascript:'" });
            }
            else if(url.protocol==='data:'){
              return this.createError({ message: "Uri can't be of schema 'data:'" });              
            }
          }
          if(value.includes('*')){
            return this.createError({ message: "Uri can't contain wildcard character '*'" });                          
          }
          if(value.includes(' ')){
            return this.createError({ message: "Uri can't contain spaces" });                          
          }
          return true
        }
      })).unique(t('yup_redirect_uri_unique')).when('grant_types',{
        is:(grant_types)=> Array.isArray(grant_types) && grant_types.includes('authorization_code'),
        then: yup.array().min(1,t('yup_required')).nullable().required(t('yup_required'))
      })
    }),
    post_logout_redirect_uris:yup.array().nullable().when('protocol',{
      is:'oidc',
      then: yup.array().nullable().when('integration_environment',(integration_environment)=>{
        integrationEnvironment = integration_environment;
      }).when('application_type',(application_type_value)=>{application_type = application_type_value;}).of(yup.string().required("Uri can't be an empty string").test('test_redirect_uri','Invalid Post Logout Redirect Uri',function(value){
        if(value){
          let url
          if (tenant?.config?.test_env.includes(integrationEnvironment)) {
            let isLocalIp = reg.regIpv4Local.test(value) || reg.regIpv6Local.test(value);
            if (isLocalIp) {
                return true;
            }
          }
          try {
            url = new URL(value);
          } catch (err) {
            return this.createError({ message: "Invalid uri" });  
          }
          if(value.includes('#')){
            return this.createError({ message: "Uri can't contain fragments" });
          }
          if(application_type==='WEB'){
            if(!tenant?.config?.test_env.includes(integrationEnvironment)&& url){
              if(url.protocol !== 'https:'&&!(url.protocol==='http:'&&url.hostname==='localhost')){
                return this.createError({ message: "Uri must be a secure url starting with https://" });              
              }
              
            }
            else{
              if(url&&!(url.protocol==='http:'||url.protocol==='https:')){
                return this.createError({ message: "Uri must be a url starting with http(s):// " });                              
              }
            }
          }
          else{
            // eslint-disable-next-line
            if(url.protocol==="javascript:"){
              return this.createError({ message: "Uri can't be of schema 'javascript:'" });
            }
            else if(url.protocol==='data:'){
              return this.createError({ message: "Uri can't be of schema 'data:'" });              
            }
          }

          if(value.includes('*')){
            return this.createError({ message: "Uri can't contain wildcard character '*'" });                          
          }
          if(value.includes(' ')){
            return this.createError({ message: "Uri can't contain spaces" });                          
          }
          return true
        }
      })).unique(t('yup_redirect_uri_unique'))
    }),
    resource_indicators:yup.array().nullable().when('protocol',{
      is:'oidc',
      then: yup.array().nullable().of(yup.string().required("Resource indicator can't be an empty string").matches(reg.regSimpleUrl,t('yup_url'))).unique(t('yup_redirect_uri_unique'))
    }),
    logo_uri:yup.string().nullable().matches(reg.regUrl,'Logo must be be a secure url starting with https://').test('testImage',t('yup_image_url'),function(imageUrl){
      imageExists(imageUrl);
      if(imageUrl&&imageUrl.length > 6000){
        return this.createError({ message: "Logo Url exceeds maximum character length (6000)" });
      }
      return true;
    }),
    country:yup.string().nullable().when('integration_environment', {
      is: (integration_environment) => tenant?.form_config?.more_info?.country?.required.includes(integration_environment),
      then: yup.string().test('testCountry','Select one of the available options',function(value){return countries.includes(value)}).required(t('yup_required')),
      otherwise: yup.string().nullable(),
    }),
    service_description:yup.string().nullable().required(t('yup_required')).max(255,'Exceeded maximum characters (255)'),
    service_description_czech:yup.string().nullable().required(t('yup_required')).max(255,'Exceeded maximum characters (255)'),
    infrastructures: yup.array().nullable().when('integration_environment', {
      is: (integration_environment) => tenant.form_config.extra_fields.infrastructures?.required.includes(integration_environment) || false,
      then: yup.array().min(1, 'Select at least one infrastructure').of(yup.string()),
      otherwise: yup.array().nullable().of(yup.string())
    }),
    service_policies:yup.array().nullable().of(policySchema).test('testPolicyTypesUnique','Policy type must be unique',function(value){
      if(!value){
        return true;
      }
      const uniqueTypes = new Set(value.map((item)=>item.name));
      return uniqueTypes.size === value.length;
    }).test('testPolicyTypesMatchCzech','Policy types must match in both language sections',function(value){
      return hasSamePolicyTypes(value, this.parent.service_policies_czech);
    }),
    service_policies_czech:yup.array().nullable().of(policySchema).test('testPolicyTypesUniqueCzech','Policy type must be unique',function(value){
      if(!value){
        return true;
      }
      const uniqueTypes = new Set(value.map((item)=>item.name));
      return uniqueTypes.size === value.length;
    }).test('testPolicyTypesMatchEnglish','Policy types must match in both language sections',function(value){
      return hasSamePolicyTypes(value, this.parent.service_policies);
    }),
    requested_attributes: yup.array().nullable().of(yup.object().shape({
      name:yup.string().nullable().required(t('yup_required')).min(1,t('yup_required')).required(t('yup_required')).max(512,'Exceeded maximum characters (512)'),
      friendly_name:yup.string().test('testAttributeName','invalid_name',function(friendly_name){
        return tenant.form_config.requested_attributes.some(e=>e.friendly_name===friendly_name);
      })
    })),
    contacts:yup.array().min(1,t('yup_required')).nullable().of(yup.object().shape({
        email:yup.string().email(t('yup_email')).required(t('yup_contact_empty')),
        type:yup.string().required(t('yup_required'))
      })).test('testContacts',function(contacts){
          let errors = "";
          tenant.form_config.contact_requirements.forEach((requirement,index)=>{
            let type_array =requirement.type.split(" ");
            let requirement_met = false; 
            contacts.forEach(contact=>{
              if(type_array.includes(contact.type)){
                requirement_met = true;
              }
            })
            if(!requirement_met){
              errors = (errors.length>0?errors+("\n") :errors) + requirement.error;
            }
          });
          if(errors.length>0){
            return this.createError({ message: errors });
          }
          else{
            return true;
          }
        }).test('testContacts',t('yup_contact_unique'),function(value){
          if(!value){
            return true;
          }
          const array = [];
          value.map(s=>array.push(s.email+s.type));
          const unique = array.filter((v, i, a) => a.indexOf(v) === i);
          if(unique.length===array.length){return true}else{return false}
          }).required(t('yup_required')),
    rp_accepted_tos: yup.boolean().when('integration_environment', {
      is: 'production',
      then: yup.boolean().oneOf([true], t('yup_terms_of_use_required')).required(t('yup_required')),
      otherwise: yup.boolean().nullable()
    }),
    rp_blocked_idps_desc:yup.array().nullable().of(yup.string().min(1,t('yup_required')).max(512,t('yup_char_max') + ' ('+512+')')),
    rp_only_allowed_idps_desc:yup.array().nullable().of(yup.string().min(1,t('yup_required')).max(512,t('yup_char_max') + ' ('+512+')')),
    check_group_membership:yup.boolean().nullable(),
    require_vo_membership:yup.boolean().nullable(),
    rp_ensure_membership_desc:yup.string().nullable().when(['check_group_membership','require_vo_membership'],{
      is:(check_group_membership,require_vo_membership)=> !!check_group_membership && !!require_vo_membership,
      then: yup.string().required(t('yup_required')).min(2,t('yup_char_min') + ' ('+2+')').max(255,t('yup_char_max') + ' ('+255+')')
    }),
    require_group_membership:yup.boolean().nullable(),
    rp_ensure_group_membership_desc:yup.string().nullable().when(['check_group_membership','require_group_membership'],{
      is:(check_group_membership,require_group_membership)=> !!check_group_membership && !!require_group_membership,
      then: yup.string().required(t('yup_required')).min(2,t('yup_char_min') + ' ('+2+')').max(255,t('yup_char_max') + ' ('+255+')')
    }),
    create_group:yup.boolean().nullable(),
    allow_registration:yup.boolean().nullable(),
    dynamic_registration:yup.boolean().nullable(),
    registration_url:yup.string().nullable().when('dynamic_registration',{
      is:true,
      then: yup.string().required(t('yup_required')).matches(reg.regSimpleUrl,t('yup_url')),
      otherwise: yup.string().nullable().matches(reg.regSimpleUrl,t('yup_url'))
    }),
    scope:yup.array().nullable().when('protocol',{
      is:'oidc',
      then: yup.array().min(1,t('yup_select_option')).nullable().of(yup.string().required("Scope value cannot be empty").min(1,t('yup_scope')).max(256,t('yup_char_max') + ' ('+ 256 +')').matches(reg.regScope,t('yup_scope_reg'))).unique(t('yup_scope_unique')).required(t('yup_required'))
    }),
    grant_types:yup.array().nullable().when('protocol',{
      is:'oidc',
      then: yup.array().min(1,t('yup_select_option')).nullable().of(yup.string().test('testGrantTypes','error-grant-types',function(value){return oidcGrantTypeOptions.includes(value)})).required(t('yup_select_option'))
    }),
    id_token_timeout_seconds:yup.number().nullable().when('protocol',{
      is:'oidc',
      then: yup.number().nullable().min(1,"Must be a positive value greater that 0").max(tenant.form_config.id_token_timeout_seconds,t('yup_exceeds_max')).required('This is a required field')}),
    access_token_validity_seconds:yup.number().nullable().when('protocol',{
      is:'oidc',
      then: yup.number().nullable().min(1,"Must be a positive value greater that 0").max(tenant.form_config.access_token_validity_seconds,t('yup_exceeds_max')).required('This is a required field')}),
    refresh_token_validity_seconds:yup.number().nullable().when(['scope','protocol'],{
      is:(scope,protocol)=> protocol==='oidc'&&scope.includes('offline_access'),
      then: yup.number().min(1,"Must be a positive value greater that 0").max(tenant.form_config.refresh_token_validity_seconds,t('yup_exceeds_max')).required('This field is required when the offline_access is selected')}),
    device_code_validity_seconds:yup.number().nullable().when(['protocol','grant_types'],{
      is:(protocol,grant_types)=> protocol==='oidc'&&grant_types.includes('urn:ietf:params:oauth:grant-type:device_code'),
      then: yup.number().nullable().min(0).max(tenant.form_config.device_code_validity_seconds,t('yup_exceeds_max')).required('This is a required field when the device code grant type is selected')}),
    code_challenge_method:yup.string().nullable().when('protocol',{
      is:'oidc',
      then: yup.string().nullable().test('test_code_challenge_method','Invalid Value',function(value){
        if(!value){
          return true;
        }
        else{
          return tenant.form_config.code_challenge_method.includes(value)
        }
      })
    }).when(['token_endpoint_auth_method','grant_types'],{
      is:(token_endpoint_auth_method,grant_types)=> token_endpoint_auth_method==='none'&&grant_types.includes('authorization_code'),
      then: yup.string().nullable().test('extra_validation',t('yup_pkce_required_with_none_auth'),function(value){return value})
    }),
    allow_introspection:yup.boolean().nullable().when('protocol',{
      is:'oidc',
      then: yup.boolean().required()
    }),
    generate_client_secret:yup.boolean().nullable().when('protocol',{
      is:'oidc',
      then: yup.boolean().required()
    }),
    reuse_refresh_token:yup.boolean().nullable().when('protocol',{
      is:'oidc',
      then: yup.boolean().nullable().required()
    }),
    protocol: yup.string().test('testProtocol',t('yup_protocol'),function(value){return ['saml','oidc'].includes(value)}).required(t('yup_protocol')),
    integration_environment:yup.string().test('testIntegrationEnv','Invalid Value',function(value){return tenant.form_config.integration_environment.includes(value)}).required(t('yup_select_option')),
    clear_access_tokens_on_refresh:yup.boolean().nullable().when('protocol',{
      is:'oidc',
      then: yup.boolean().nullable().required()
    }),
    client_secret:yup.string().nullable().when('protocol',{
      is:'oidc',
      then: yup.string().nullable().max(256,t('yup_char_max') + ' ('+256+')')
    }),
    metadata_url:yup.string().nullable().when('protocol',{
      is:'saml',
      then: yup.string().nullable().required(t('yup_required')).matches(reg.regSimpleUrl,'Enter a valid Url').test('testXml','Invalid Metadata',function(value){
        // Metadata Url is Already Loaded?
        
        // if(!value||metadataChecked!==value){
        //   setMetadataLoading(false);
        //   //setMetadataWarning();
        //   clearTimeout(metadataUrlLoadTimeout);
        // }        
        // if(value&&value.match(reg.regSimpleUrl)&&metadataChecked!==value&&value!==metadataLoaded.metadata_url){
        //   new Promise((resolve,reject)=>{
        //     getMetadata(value,resolve);
        //   })
        // }



        if(value&&value.match(reg.regSimpleUrl)&&metadataChecked!==value&&value!==metadataLoaded.metadata_url){
          clearTimeout(timeouts[timeoutId]);
          new Promise((resolve,reject)=>{
            getMetadata(value,resolve);
          })
        }
        else{
          setMetadataLoading(false);
        }
        if(metadataAsyncError){
          return this.createError({ message:metadataAsyncError})
        }
        return true
        
          
      
        
      })
    
    }),
    assertion_consumer_service:yup.string().nullable().when('protocol',{
      is:'saml',
      then:yup.string().nullable().matches(reg.regSimpleUrl,t('yup_url'))
    }),
    single_logout_service:yup.string().nullable().when('protocol',{
      is:'saml',
      then:yup.string().nullable().matches(reg.regSimpleUrl,t('yup_url'))
    }),
    signing_cert:yup.string().nullable().when('protocol',{
      is:'saml',
      then:yup.string().nullable()
    }),
    required_attributes:yup.array().nullable().when('protocol',{
      is:'saml',
      then:yup.array().min(1,t('yup_select_option')).of(yup.string().required())
    }),
    token_endpoint_auth_signing_alg:yup.string().nullable().when(['protocol',"token_endpoint_auth_method"],{
      is:(protocol,token_endpoint_auth_method)=> protocol==='oidc'&&(token_endpoint_auth_method==="private_key_jwt"||token_endpoint_auth_method==="client_secret_jwt"),
      then: yup.string().required(t('yup_select_option')).test('testTokenEndpointSigningAlgorithm','Invalid Value',function(value){return tenant.form_config.token_endpoint_auth_signing_alg.includes(value)})
    }),
    application_type:yup.string().nullable().when('protocol',{
      is:'oidc',
      then: yup.string().nullable().required(t('yup_select_option')).test('testApplicationType','Invalid Value',function(value){return tenant.form_config.application_type.includes(value)})
    }),
    token_endpoint_auth_method:yup.string().nullable().when('protocol',{
      is:'oidc',
      then: yup.string().nullable().required(t('yup_select_option')).test('testTokenEndpointAuthMethod','Invalid Value',function(value){return oidcTokenEndpointMethodOptions.includes(value)})
    }),
    jwks_uri:yup.string().nullable().when(['protocol','token_endpoint_auth_method'],{
      is:(protocol,token_endpoint_auth_method)=> protocol==='oidc'&&token_endpoint_auth_method==="private_key_jwt" ,
      then:yup.string().nullable().test('test','Required Field',function(value){if(this.parent.jwks||value){return true}else{return false}}).test('testTokenEndpointAuthMethod','Invalid Value',function(value){ if(this.parent.jwks||(value&&reg.regSimpleUrl.test(value))){return true}else{return false}})
    }),
    jwks:yup.object().typeError("test").nullable().when(['protocol','jwks_uri','token_endpoint_auth_method'],{
      is:(protocol,jwks_uri,token_endpoint_auth_method)=> protocol==='oidc'&&!jwks_uri&&token_endpoint_auth_method==="private_key_jwt" ,
      then:yup.object().nullable().test('test','Required Field',function(value){if(this.parent.jwks_uri||value){return true}else{return false}}).test('testJwks','Invalid Schema',function(value){
        if(!value){
          return true
        }
        else if(value.keys&&typeof(value.keys)==='object'&&Object.keys(value).length===1){
          return true
        }
        else{
          return false
        }
      })
    }),
    organization_name:yup.string().nullable().when(['integration_environment'],{
      is:(integration_environment)=> tenant.form_config.extra_fields.organization.required.includes(integration_environment),
      then: yup.string().nullable().required('This is a required field')
    }),
    organization_url:yup.string().nullable().nullable().when(['integration_environment'],{
      is:(integration_environment)=> tenant.form_config.extra_fields.organization.required.includes(integration_environment),
      then: yup.string().nullable().matches(reg.regSimpleUrl,t('yup_secure_url')).required('This is a required field')
    }),
    entity_id:yup.string().matches(reg.regUrl,t('yup_secure_url')).nullable().when('protocol',{
      is:'saml',
      then: yup.string().nullable().required('This is a required field').min(4,t('yup_char_min') + ' ('+4+')').test('testAvailable',t('yup_entity_id'),function(value){
        if(props.initialValues.entity_id===value && !props.copy){
          return true
        }
        else{
          return new Promise((resolve,reject)=>{
              
              clearTimeout(availabilityCheckTimeout);
              if(!value||!reg.regUrl.test(value))
                {resolve(true)}
              else{
                setCheckingAvailability(true);
                //&&!(props.copy&&)
                if(value===checkedId &&formRef.current.values.integration_environment===checkedEnvironment){
                  setCheckingAvailability(false);
                  resolve(availabilityCheck);
                }
                else{
                  availabilityCheckTimeout = setTimeout(()=> {
                    fetch(config.host[tenant_name]+'tenants/'+tenant_name+'/check-availability?value='+ value +'&protocol=saml&environment='+ this.parent.integration_environment+(petition_id?('&petition_id='+petition_id):"")+(service_id?('&service_id='+service_id):""), {
                      method:'GET',
                      credentials:'include',
                      headers:{
                        'Content-Type':'application/json'
                      }}).then(response=>{
                        if(response.status===200){

                          return response.json();
                        }
                        else {
                          return false
                        }
                      }).then(response=>{
                          setCheckedId(value);
                          setCheckedEnvironment(this.parent.integration_environment);
                          setCheckingAvailability(false);
                          if(response){
                            setCheckedId(value);
                            setAvailabilityCheck(response.available);
                            resolve(response.available)}
                          else{
                            resolve(false);
                          }
                        }
                        ).catch(()=>{resolve(true)})
                      },1000);
                }
                
              }
            })

        }  
      })
    })
  });



  const toggleCopyDialog = () => {
    setShowCopyDialog(!showCopyDialog);
  }

  const toggleMoveDialog = () => {
    setShowMoveDialog(!showMoveDialog);
  }

  const canReview = (integration_environment) => {
    return (
      // Allow when user can review service requests targeting a restricted ennvironment    
        (props.user.actions.includes('review_restricted')&& tenant?.config?.restricted_env.includes(integration_environment))
      ||
      // Allow when user can review their own petition and service request targets a testing environment
        (tenant?.config?.test_env.includes(integration_environment) && props.user.actions.includes('review_own_petition'))
      ||
      // Allow when user can review all petitions and service request does not target a restricted environment 
        (props.user.actions.includes('review_petition')&& !tenant?.config?.restricted_env.includes(integration_environment))
      );
  }

  const createNewPetition = (petition) => {
    // eslint-disable-next-line
    if(service_id){
      petition.type='edit';

      petition.service_id=service_id;
    }
    else{
      petition.type='create';
      petition.service_id=null;
    }
    if (diff(petition,props.initialValues)||props.copy){
      setAsyncResponse(true);
      fetch(config.host[tenant_name]+'tenants/'+tenant_name+'/petitions', {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        credentials: 'include', // include, *same-origin, omit
        headers: {
        'Content-Type': 'application/json'  },
        body: JSON.stringify(petition)
      }).then(async response=> {
        setAsyncResponse(false);
        let responseData = await response.json();
        if(response.status===200){
          let reviewEnabled = canReview(petition.integration_environment); 
          setModalData({
            title:t('new_petition_title'),
            message: reviewEnabled? t('petition_success_review_msg'):t('petition_success_msg'),
            service_id: service_id,
            tenant: tenant_name,
            petition_id: responseData.id,
            reviewEnabled
          });
        }
        else if(response.status===401){
          setLogout(true);
        }
        else{
          setModalData({
            title:t('new_petition_title'),
            message:t('petition_error_msg') + response.status,
            tenant:tenant_name,
            reviewEnabled:false
          })
        }
      });
    }
    else{
      setAsyncResponse(false);
      setModalData({
        title:t('petition_no_change_title'),
        message:t('petition_no_change_msg'),
        tenant:tenant_name,
        reviewEnabled:false
      })
    }
  }


  const editPetition = (petition) => {
    petition.type=props.type;
    petition.service_id=service_id;
    if(props.type === 'delete'){
      petition.type = 'edit';
    }
    if(diff(petition,props.initialValues)){
      setAsyncResponse(true);
      fetch(config.host[tenant_name]+'tenants/'+tenant_name+'/petitions/'+petition_id, {
        method: 'PUT', // *GET, POST, PUT, DELETE, etc.
        credentials: 'include', // include, *same-origin, omit
        headers: {
        'Content-Type': 'application/json'  },
        body: JSON.stringify(petition) // body data type must match "Content-Type" header
      }).then(async response=> {
        
        setAsyncResponse(false);
        let reviewEnabled = canReview(petition.integration_environment); 
        if(response.status===200){
          setModalData({
            title:t('edit_petition_title'),
            message: reviewEnabled? t('petition_success_review_msg'):t('petition_success_msg'),
            service_id: service_id,
            tenant: tenant_name,
            petition_id: petition_id,
            reviewEnabled
          });
        }
        else if(response.status===401){
          setLogout(true);
        }
        else if(response.status===404){
          setNotFound(true);
        }
        else{
          setModalData({
            title:t('new_petition_title'),
            message:t('petition_error_msg') + response.status,
            tenant:tenant_name,
            reviewEnabled:false
          })
        }
      });
    }
    else{
      setModalData({
        title:t('petition_no_change_title'),
        message:t('petition_no_change_msg'),
        tenant:tenant_name,
        reviewEnabled:false
      });
    }
  }

  const deletePetition = ()=>{
    setAsyncResponse(true);
    fetch(config.host[tenant_name]+'tenants/'+tenant_name+'/petitions/'+petition_id, {
      method: 'DELETE', // *GET, POST, PUT, DELETE, etc.
      credentials: 'include', // include, *same-origin, omit
      headers: {
      'Content-Type': 'application/json'}}).then(response=> {
      setAsyncResponse(false);
      if(response.status===200){
        setModalData({
          title:t('request_submit_title'),
          message:t('request_cancel_success_msg'),
          tenant:tenant_name,
          reviewEnabled:false
        });
      }
      else if(response.status===401){
        setLogout(true);
      }
      else if(response.status===404){
        setNotFound(true);
      }
      else{
        setModalData({
          title:t('request_submit_title'),
          message:t('request_cancel_fail_msg')+response.status,
          tenant:tenant_name,
          reviewEnabled:false
        });
      }
    });
  }

  const addOrganization = async (data) => {
    if(!data.organization_id){
      return await fetch(config.host[tenant_name]+'tenants/'+tenant_name+'/organizations', {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          credentials: 'include', // include, *same-origin, omit
          headers: {
          'Content-Type': 'application/json'},
          body:JSON.stringify({organization_name:data.organization_name,organization_url:data.organization_url,ror_id:data.ror_id})
      }).then(response=>{
        if(response.status===200||response.status===409){
          return response.json();
        }
        else if(response.status===401){
          setLogout(true);
        }
        else{
          return false
        }
      }).then((response)=>{
        if(response){
          return response.organization_id;
        }
        else{
          return response
        }
        
      })
    }
    else{
      return data.organization_id;
    }
    
  }

  const getTags = () =>{
    fetch(config.host[tenant_name]+ 'tenants/' + tenant_name + '/tags/services/' + service_id ,{
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'}
    }).then(response => {
      if(response.status===200){
        return response.json();
      }
      else if(response.status===401){
        setLogout(true);
      }
      else{
        return false
      }
    }).then((response)=>{
      if(response){
        setServiceTags(response);
      }
      else{
        setServiceTags([]);
      }
    })
  }


  const reviewPetition = (comment,type)=>{
      setAsyncResponse(true);
      fetch(config.host[tenant_name]+'tenants/'+tenant_name+'/petitions/'+petition_id+'/review', {
        method: 'PUT', // *GET, POST, PUT, DELETE, etc.
        credentials: 'include', // include, *same-origin, omit
        headers: {
        'Content-Type': 'application/json'  },
        body:JSON.stringify({comment:comment,type:type})
    }).then(response=> {
        setAsyncResponse(false);
        if(response.status===200){
          setModalData({
            title:t('review_'+props.type+'_title'),
            tenant:tenant_name,
            message:t('review_success'),
            reviewEnabled:false
          });
        }
        else if(response.status===401){
          setLogout(true);
          return false;
        }
        else if(response.status===404){
          setNotFound(true);
          return false;
        }
        else{
          setModalData({
            title:t('review_'+props.type+'_title'),
            message:t('review_error') +response.status,
            tenant:tenant_name,
            reviewEnabled:false
          });
        }
      });
  }



  const postApi= async (data)=>{
    data = generateValues(data);
    data.service_policies = mergePolicyValuesForApi(data.service_policies, data.service_policies_czech);
    delete data.service_policies_czech;
    // Ensure new fields are always present (even if empty) to pass backend validation
    if (!Array.isArray(data.service_policies)) data.service_policies = [];
    if (!data.hasOwnProperty('infrastructures')) data.infrastructures = [];
    if (!data.hasOwnProperty('service_login_url')) data.service_login_url = '';
    if (!data.hasOwnProperty('service_login_url_czech')) data.service_login_url_czech = '';
    
    let organization_id;
    if(!tenant.form_config.extra_fields.organization.hide.includes(data.integration_environment)){
      organization_id = await addOrganization(data);
    }
    if(organization_id||tenant.form_config.extra_fields.organization.hide.includes(data.integration_environment)){
      data.organization_id = organization_id;
      if(!props.type){
        createNewPetition(data);
      }
      else {
        data.type = props.type;
        editPetition(data);
      }
    }
    else{
      setNotFound(true)
    }
  }

  const getInitialTouched = (initVal) =>{
    let touchedActive={};
    if(!(service_id||petition_id)){
      return {}
    }
    else{
      for (const property in initVal){
        touchedActive[property] = true;
      }
      for (const property in tenant.form_config.extra_fields){
        if(!initVal.hasOwnProperty[property]){
          touchedActive[property] = true;
        }
      }

      return touchedActive;
    }
  }
  const protocolOptions = (protocols)=> {
    let options = [];
    protocols.forEach(protocol=>{
      options.push(protocol.toUpperCase() + ' Service');
    })
    return options
  }

  // Memoize the options so they don't trigger re-render loops
  const infrastructureOptions = React.useMemo(() => 
    tenant?.form_config?.extra_fields?.infrastructures?.options || [], 
    [tenant]
  );

  return(
    <React.Fragment>
    <Logout logout={logout}/>
    <ManageTags manageTags={manageTags} setManageTags={setManageTags} tags={serviceTags} service_id={service_id} getServices={()=>{getTags()}}/>
    <NotFound notFound={notFound}/>
    {formValues?
    <Formik
      initialValues={formValues}
      validateOnMount={service_id||petition_id||props.copy}
      initialTouched={getInitialTouched(formValues)}
      enableReinitialize={true}
      validationSchema={schema}
      innerRef={formRef}
      validate={dynamicValidation}
      onSubmit={(values,{setSubmitting}) => {
        
          setSubmitting(true);
          setHasSubmitted(true);
          setSubmitDisabled(true);
          if(!(values.token_endpoint_auth_method==="client_secret_jwt"||values.token_endpoint_auth_method==="private_key_jwt")){
            values.token_endpoint_auth_signing_alg=null;
          }
          if(values.token_endpoint_auth_method!=="private_key_jwt"){
            values.jwks=null;
            values.jwks_uri=null;
          }
          if(values.protocol==='oidc'){
            values.generate_client_secret = true;
          }
          if(values.token_endpoint_auth_method==="private_key_jwt"||values.token_endpoint_auth_method==="none"){
            values.client_secret = '';
          }
          if(values.jwks_uri){
            values.jwks=null;
          }
          if(values.jwks){
            values.jwks = JSON.parse(values.jwks);
            values.jwks_uri=null;
            // let check = values.jwks.replace(/\n/g, "\\\\n").replace(/\r/g, "\\\\r").replace(/\t/g, "\\\\t");
            // values.jwks = JSON.parse(check);
          }
          postApi(values);
        
      }}
    >
    {({
      handleSubmit,
      handleChange,
      handleBlur,
      values,
      setFieldValue,
      setFieldTouched,
      setTouched,
      touched,
      isValid,
      validateField,
      validateForm,
      setValues,
      setErrors,
      submitCount,
      errors,
      isSubmitting})=>(
      <div className="tab-panel">
              {showCopyDialog?<CopyDialog service_id={service_id} show={showCopyDialog} toggleCopyDialog={toggleCopyDialog} current_environment={props.initialValues.integration_environment} />:null}
              {serviceMoveEnabled&&showMoveDialog?<MoveDialog service_id={service_id} show={showMoveDialog} toggleMoveDialog={toggleMoveDialog} current_environment={props.initialValues.integration_environment} />:null}

              <ProcessingRequest active={asyncResponse}/>
              {props.user.actions.includes('manage_tags')&&service_id?
                <div className='service-form-tags-container'>
                  <hr/>
                  <h5>Tags</h5>
                  <OverlayTrigger
                    placement='top'
                    overlay={
                      <Tooltip id={`tooltip-top`}>
                        Manage Service Tags
                      </Tooltip>
                    }
                  >
                    <div className="service-form-tags-edit" onClick={()=>{setManageTags(true)}}><FontAwesomeIcon icon={faPen}/></div>
                  </OverlayTrigger>
                  <Form.Text className="text-mute"> Tags can be used to filter service search results </Form.Text>
                  <div className="service-form-tags-button-container">
                    {serviceTags.length>0?serviceTags.map((tag,index)=>{
                      return (    
                        <Button key={index} className="tag-button-service-form" disabled variant="outline-dark">{tag}</Button>
                      )
                    }):<span className="text-muted">No active tags for this service</span>}
                  </div>
                  <hr/>
                </div>:null}
              {showInitErrors&&!Object.keys(errors).length === 0?
                <Alert variant='warning' className="invitation_alert">
                The following Service Configuration contains some invalid values or is missing a required field. To fix this issue submit a valid reconfiguration request
                </Alert>
              :null
              }
              <Form noValidate onSubmit={handleSubmit}>
                {props.disabled?null:
                  <div className="form-controls-container">
                    {props.review?
                      <ReviewComponent errors={errors} asyncErrors={metadataAsyncError} disabled={metadataLoading} values={values} changes={props.changes}  reviewPetition={reviewPetition} type={props.type} restrictReview={restrictReview}/>
                      :
                      <React.Fragment>
                        <div className="form-submit-cancel-container">
                          <Button className='submit-button' type="submit" disabled={submitDisabled||metadataLoading||checkingAvailability} variant="primary" ><FontAwesomeIcon icon={faCheckCircle}/>{t('button_submit')}</Button>
                          {petition_id?<Button variant="danger" onClick={()=>deletePetition()}><FontAwesomeIcon icon={faBan}/>{t('button_cancel_request')}</Button>:null}
                        </div>
                      </React.Fragment>
                    }
                  </div>
                }
                <div className="form-tabs-container">
                <Tabs className="form-tabs " defaultActiveKey="general" id="uncontrolled-tab-example">

                  <Tab eventKey="general" title={t('form_tab_general')}>

                                          <InputRow 
                        moreInfo={tenant.form_config.more_info.service_name} 
                        title={t('form_service_name')} 
                        required={true} 
                        description={t('form_service_name_desc')} 
                                            error={(errors.service_name || errors.service_name_czech) ? t('form_service_name_bilingual_error') : null} 
                        touched={touched.service_name || touched.service_name_czech}
                      >
                        {/* English Input */}
                        <div className="d-flex align-items-start mb-2">
                          <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>EN</span>
                          <div className="flex-grow-1">
                            <SimpleInput
                              name='service_name'
                              placeholder={t('form_type_prompt')}
                              onChange={handleChange}
                              value={values.service_name}
                              isInvalid={hasSubmitted ? !!errors.service_name : (!!errors.service_name && touched.service_name)}
                              onBlur={handleBlur}
                              disabled={disabled}
                              changed={props.changes ? props.changes.service_name : null}
                            />
                          </div>
                        </div>

                        {/* Czech Input */}
                        <div className="d-flex align-items-start">
                          <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>CS</span>
                          <div className="flex-grow-1">
                            <SimpleInput
                              name='service_name_czech'
                              placeholder={t('form_service_name_czech_placeholder')}
                              onChange={handleChange}
                              value={values.service_name_czech || ''}
                              isInvalid={hasSubmitted ? !!errors.service_name_czech : (!!errors.service_name_czech && touched.service_name_czech)}
                              onBlur={handleBlur}
                              disabled={disabled}
                              changed={props.changes ? props.changes.service_name_czech : null}
                            />
                          </div>
                        </div>
                      </InputRow>

                    <InputRow 
                      moreInfo={tenant.form_config.more_info.service_description} 
                      title={t('form_description')} 
                      required={true} 
                      description={t('form_description_desc')} 
                      error={(errors.service_description || errors.service_description_czech) ? t('form_service_description_bilingual_error') : null} 
                      touched={touched.service_description || touched.service_description_czech}
                    >
                      {/* English Input */}
                      <div className="d-flex align-items-start mb-3">
                        <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>EN</span>
                        <div className="flex-grow-1">
                          <TextAria
                            value={values.service_description ? values.service_description : ''}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            name='service_description'
                            placeholder={t('form_type_prompt')}
                            isInvalid={hasSubmitted ? !!errors.service_description : (!!errors.service_description && touched.service_description)}
                            disabled={disabled}
                            changed={props.changes ? props.changes.service_description : null}
                          />
                        </div>
                      </div>

                      {/* Czech Input */}
                      <div className="d-flex align-items-start">
                        <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>CS</span>
                        <div className="flex-grow-1">
                          <TextAria
                            value={values.service_description_czech ? values.service_description_czech : ''}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            name='service_description_czech'
                            placeholder={t('form_service_description_czech_placeholder')}
                            isInvalid={hasSubmitted ? !!errors.service_description_czech : (!!errors.service_description_czech && touched.service_description_czech)}
                            disabled={disabled}
                            changed={props.changes ? props.changes.service_description_czech : null}
                          />
                        </div>
                      </div>
                    </InputRow>

                    <InputRow 
                      moreInfo={tenant.form_config.more_info.service_login_url} 
                      title={t('form_service_login_url')} 
                      required={true}
                      description={tenant.form_config.more_info.service_login_url?.description}
                      error={errors.service_login_url || errors.service_login_url_czech ? t('form_service_login_url_bilingual_error') : null}
                      touched={touched.service_login_url || touched.service_login_url_czech}
                    >
                      {/* English Input */}
                      <div className="d-flex align-items-start mb-3">
                        <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>EN</span>
                        <div className="flex-grow-1">
                          <SimpleInput
                            name='service_login_url'
                            placeholder={t('form_url_placeholder')}
                            onChange={handleChange}
                            value={values.service_login_url || ''}
                            isInvalid={hasSubmitted ? !!errors.service_login_url : (!!errors.service_login_url && touched.service_login_url)}
                            onBlur={handleBlur}
                            disabled={disabled}
                            changed={props.changes ? props.changes.service_login_url : null}
                          />
                          <UrlWarning url={values.service_login_url} touched={hasSubmitted || touched.service_login_url}/>
                        </div>
                      </div>

                      {/* Czech Input */}
                      <div className="d-flex align-items-start">
                        <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>CS</span>
                        <div className="flex-grow-1">
                          <SimpleInput
                            name='service_login_url_czech'
                            placeholder={t('form_url_placeholder')}
                            onChange={handleChange}
                            value={values.service_login_url_czech || ''}
                            isInvalid={hasSubmitted ? !!errors.service_login_url_czech : (!!errors.service_login_url_czech && touched.service_login_url_czech)}
                            onBlur={handleBlur}
                            disabled={disabled}
                            changed={props.changes ? props.changes.service_login_url_czech : null}
                          />
                          <UrlWarning url={values.service_login_url_czech} touched={hasSubmitted || touched.service_login_url_czech}/>
                        </div>
                      </div>
                    </InputRow>

                      <InputRow  moreInfo={tenant.form_config.more_info.integration_environment} title={t('form_integration_environment')} required={true} extraClass='select-col' error={errors.integration_environment} touched={touched.integration_environment}>
                        <SelectEnvironment
                          onBlur={handleBlur}
                          optionsTitle={capitalWords(tenant.form_config.integration_environment)}
                          options={tenant.form_config.integration_environment}
                          name="integration_environment"
                          values={values}
                          isInvalid={hasSubmitted?!!errors.integration_environment:(!!errors.integration_environment&&touched.integration_environment)}
                          onChange={handleChange}
                          disabled={disabled||tenant.form_config.integration_environment.length===1||props.copy||props.disableEnvironment}
                          changed={props.changes?props.changes.integration_environment:null}
                          copybuttonActive={props.owned&&props.disabled&&service_id}
                          toggleCopyMoveDialog={serviceMoveEnabled ? toggleMoveDialog : toggleCopyDialog}
                          moveInsteadCopy={serviceMoveEnabled}
                        />
                      </InputRow>
                      <InputRow  moreInfo={{}} title={t('form_logo')}>
                        <LogoInput
                          value={values.logo_uri?values.logo_uri:''}
                          name='logo_uri'
                          description={t('form_logo_desc')}
                          moreInfo={tenant.form_config.more_info.logo_uri}
                          onChange={handleChange}
                          error={errors.logo_uri}
                          touched={touched.logo_uri}
                          onBlur={handleBlur}
                          validateField={validateField}
                          isInvalid={hasSubmitted?!!errors.logo_uri:(!!errors.logo_uri&&touched.logo_uri)}
                          disabled={disabled}
                          warning={logoWarning}
                          changed={props.changes?props.changes.logo_uri:null}
                        />
                      </InputRow>

                      <InputRow hide={!tenant?.form_config?.more_info?.country?.enabled} moreInfo={tenant.form_config.more_info.country.description} title={t('form_jurisdiction_service_title')} required={tenant?.form_config?.more_info?.country?.required.includes(values.integration_environment) && tenant.form_config.more_info.country.enabled} extraClass='select-col' error={errors.country} touched={touched.country}>
                        <CountrySelect
                          onBlur={handleBlur}
                          placeholder={t('form_country_placeholder')}
                          name="country"
                          values={values}
                          isInvalid={hasSubmitted?!!errors.country:(!!errors.country&&touched.country)}
                          onChange={handleChange}
                          disabled={disabled}
                          changed={props.changes?props.changes.country:null}
                        />
                      </InputRow>

                  {tenant.form_config.extra_fields.infrastructures ?
                  <InputRow  moreInfo={tenant.form_config.more_info.infrastructures} title={t('form_infrastructures_title')} required={tenant.form_config.extra_fields.infrastructures.required.includes(values.integration_environment)} error={typeof(errors.infrastructures)==='string'?errors.infrastructures:null} touched={touched.infrastructures} description={t('form_infrastructures_desc')}>
                    <CheckboxList
                      name='infrastructures'
                      values={values.infrastructures}
                      listItems={infrastructureOptions}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={disabled}
                      changed={props.changes?props.changes.infrastructures:null}
                    />
                  </InputRow>
                : null}

                  <InputRow 
                    moreInfo={tenant.form_config.more_info.service_policies} 
                    title={t('form_service_policies_title')} 
                    required={true} 
                    error={Array.isArray(errors.service_policies) || Array.isArray(errors.service_policies_czech) ? t('form_service_policies_bilingual_error') : ''} 
                    touched={touched.service_policies || touched.service_policies_czech} 
                    description={t('form_service_policies_desc')}
                  >
                    {/* English Input */}
                    <div className="d-flex align-items-start mb-3">
                      <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>EN</span>
                      <div className="flex-grow-1">
                        <ServicePolicies
                          values={values.service_policies}
                          name='service_policies'
                          empty={typeof(errors.service_policies) === 'string'}
                          error={errors.service_policies}
                          touched={touched.service_policies}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          setFieldTouched={setFieldTouched}
                          disabled={disabled}
                          policyTypeOptions={policyTypeOptions}
                          changed={props.changes ? props.changes.service_policies : null}
                        />
                      </div>
                    </div>

                    {/* Czech Input */}
                    <div className="d-flex align-items-start">
                      <span className="badge bg-secondary me-2 mt-2" style={{minWidth: '35px', marginRight: '12px'}}>CS</span>
                      <div className="flex-grow-1">
                        <ServicePolicies
                          values={values.service_policies_czech}
                          name='service_policies_czech'
                          empty={typeof(errors.service_policies_czech) === 'string'}
                          error={errors.service_policies_czech}
                          touched={touched.service_policies_czech}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          setFieldTouched={setFieldTouched}
                          disabled={disabled}
                          policyTypeOptions={policyTypeOptions}
                          changed={props.changes ? props.changes.service_policies_czech : null}
                        />
                      </div>
                    </div>
                  </InputRow>

                      <InputRow hide={!tenant?.form_config?.more_info?.country?.enabled} moreInfo={tenant.form_config.more_info.country.description} title={'Jurisdiction of the Service'} required={tenant?.form_config?.more_info?.country?.required.includes(values.integration_environment) && tenant.form_config.more_info.country.enabled} extraClass='select-col' error={errors.country} touched={touched.country}>
                        <CountrySelect
                          onBlur={handleBlur}
                          placeholder={'Select country'}
                          name="country"
                          values={values}
                          isInvalid={hasSubmitted?!!errors.country:(!!errors.country&&touched.country)}
                          onChange={handleChange}
                          disabled={disabled}
                          changed={props.changes?props.changes.country:null}
                        />
                      </InputRow>
                      {tenant.form_config.extra_fields.organization&&!tenant?.form_config?.extra_fields?.organization?.hide.includes(values.integration_environment)?
                      <React.Fragment>
                        <InputRow  moreInfo={tenant.form_config.more_info.organization_name} required={tenant.form_config.extra_fields.organization.required.includes(values.integration_environment)} title={t('form_organization_title')} description={t('form_organization_desc')} error={errors.organization_name} touched={touched.organization_name}>
                            <OrganizationField
                              name='organization_name'
                              placeholder={t('form_organization_placeholder')}
                              onChange={handleChange}
                              values={values}
                              isInvalid={hasSubmitted?!!errors.organization_name:(!!errors.organization_name&&touched.organization_name)}
                              setFieldTouched={setFieldTouched}
                              validateForm={validateForm}
                              validateField={validateField}
                              disabled={disabled}
                              setFieldValue={setFieldValue}
                              setDisabledOrganizationFields={setDisabledOrganizationFields} 
                              changed={props.changes?props.changes.organization_name:null}
                            />
                          </InputRow>
                        </React.Fragment>
                        :null
                      }
                    <InputRow moreInfo={tenant.form_config.more_info.organization_url} title={t('form_organization_url_title')} required={tenant.form_config.extra_fields.organization.required.includes(values.integration_environment)} description={t('form_organization_url_desc')} error={errors.organization_url} touched={touched.organization_url}>
                        <SimpleInput
                            name='organization_url'
                            placeholder={t('form_url_placeholder')}
                            onChange={handleChange}
                            value={values.organization_url}
                            isInvalid={hasSubmitted?!!errors.organization_url:(!!errors.organization_url&&touched.organization_url)}
                            onBlur={handleBlur}
                            disabled={disabled||disabledOrganizationFields.includes('organization_url')}
                            changed={props.changes?props.changes.organization_url:null}
                        />
                    </InputRow>
                      
                      {Object.entries(tenant.form_config.extra_fields).map(([name,field_data])=>{
                        field_data.name = name;                    
                        return (field_data.tab==='general'&&field_data.tag!=='once'?<React.Fragment key={name}>
                          {generateInput({
                            field_data,
                            initialValues:props.initialValues,
                            values,
                            errors,
                            touched,
                            changes:props.changes,
                            handleChange,
                            hasSubmitted,
                            disabled,
                            handleBlur,
                            tenant
                          })}
                      </React.Fragment>:null)                    
                      })
                    }

                      <InputRow  moreInfo={tenant.form_config.more_info.contacts} title={t('form_contacts')} required={true} error={typeof(errors.contacts)==='string'?errors.contacts:null} touched={touched.contacts} description={t('form_contacts_desc')}>
                        <Contacts
                          values={values.contacts}
                          placeholder={t('form_type_prompt')}
                          name='contacts'
                          empty={typeof(errors.contacts)==='string'?true:false}
                          error={errors.contacts}
                          touched={touched.contacts}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          setFieldTouched={setFieldTouched}
                          disabled={disabled}
                          changed={props.changes?props.changes.contacts:null}
                        />
                      </InputRow>

                      <InputRow 
                        title={t('form_terms_of_use_title')} 
                        required={values.integration_environment === 'production'} 
                        error={errors.rp_accepted_tos} 
                        touched={touched.rp_accepted_tos}
                      >
                        <SimpleCheckbox
                          name='rp_accepted_tos'
                          label={
                            <span>
                              {t('form_terms_of_use_checkbox_prefix', 'I have read and accept the ')}
                              
                              {values.infrastructures && values.infrastructures.length > 0 ? (
                                values.infrastructures.map((item, index) => {
                                  const isLast = index === values.infrastructures.length - 1;
                                  const isSecondToLast = index === values.infrastructures.length - 2;
                                  
                                  return (
                                    <React.Fragment key={item}>
                                      {infrastructureTermUrls[item] ? (
                                        <a href={infrastructureTermUrls[item]} target='_blank' rel='noopener noreferrer'>
                                          {item} Terms of Use for Service Providers
                                        </a>
                                      ) : (
                                        <span>{item} Terms of Use for Service Providers</span>
                                      )}
                                      
                                      {!isLast && (isSecondToLast ? ' and ' : ', ')}
                                    </React.Fragment>
                                  );
                                })
                              ) : (
                                <span>Terms of Use for Service Providers</span>
                              )}
                            </span>
                          }
                          onChange={handleChange}
                          onBlur={handleBlur}
                          checked={values.rp_accepted_tos}
                          disabled={disabled}
                          changed={props.changes ? props.changes.rp_accepted_tos : null}
                        /> 

                        <div className='text-muted text-left mb-2'>
                          {t('form_terms_of_use_desc', 'By marking the checkbox, you confirm that you recognise and comply with the Terms of Use for Service Providers.')}
                        </div>
                      </InputRow>

                      {Object.entries(tenant.form_config.extra_fields).map(([name,field_data])=>{
                        field_data.name = name;                    
                        return (field_data.tab==='general'&&field_data.tag==='once'?<React.Fragment key={name}>
                          {generateInput({
                            field_data,
                            initialValues:props.initialValues,
                            values,
                            errors,
                            touched,
                            changes:props.changes,
                            handleChange,
                            hasSubmitted,
                            disabled,
                            handleBlur,
                            tenant
                          })}
                          </React.Fragment>:null)                    
                        })
                      }
                    </Tab>
                    <Tab eventKey="protocol" title={t('form_tab_protocol')}>
                      <InputRow title={t('form_protocol')} required={true} extraClass='select-col' error={errors.protocol} touched={touched.protocol}>
                        <Select
                          onBlur={handleBlur}
                          optionsTitle={['Select one option',...protocolOptions(tenant.form_config.protocol)]}
                          options={['',...tenant.form_config.protocol]}
                          name="protocol"
                          values={values}
                          isInvalid={hasSubmitted?!!errors.protocol:(!!errors.protocol&&touched.protocol)}
                          onChange={handleChange}
                          disabled={disabled||props.initialValues.protocol}
                          changed={props.changes?props.changes.protocol:null}
                        />
                      </InputRow>
                      {values.protocol==='oidc'?
                        <React.Fragment>
                           <InputRow  moreInfo={tenant.form_config.more_info.application_type} title={'Application Type'} required={true} description={""} error={errors.application_type} touched={touched.application_type}>
                            <SimpleRadio
                              name='application_type'
                              onChange={handleChange}
                              values={values}
                              radio_items={['WEB','NATIVE']}
                              setFieldValue={setFieldValue}
                              radio_items_titles={['Web','Native']}
                              value={values.application_type}
                              isInvalid={hasSubmitted?(!!errors.application_type):(!!errors.application_type&&touched.application_type&&!checkingAvailability)}
                              onBlur={handleBlur}
                              className={'application-type-container'}
                              disabled={disabled}
                              changed={props.changes?props.changes.application_type:null}
                             />
                           </InputRow>
                           <InputRow  moreInfo={tenant.form_config.more_info.redirect_uris} title={t('form_redirect_uris')} required={values.grant_types.includes('authorization_code')} error={typeof(errors.redirect_uris)==='string'?errors.redirect_uris:null}  touched={touched.redirect_uris} description={t('form_redirect_uris_desc')}>
                             <ListInput
                               values={values.redirect_uris}
                               placeholder={t('form_type_prompt')}
                               empty={(typeof(errors.redirect_uris)==='string')?true:false}
                               name='redirect_uris'
                               error={errors.redirect_uris}
                               touched={touched.redirect_uris}
                               onBlur={handleBlur}
                               onChange={handleChange}
                               integrationEnvironment = {values.integration_environment}
                               setFieldTouched={setFieldTouched}
                               disabled={disabled}
                               changed={props.changes?props.changes.redirect_uris:null}
                             />
                           </InputRow>
                           {!tenant.form_config.disabled_fields.includes("post_logout_redirect_uris")?
                              <InputRow  moreInfo={tenant.form_config.more_info.post_logout_redirect_uris} title={t('form_post_logout_redirect_uris_title')} error={typeof(errors.post_logout_redirect_uris)==='string'?errors.post_logout_redirect_uris:null}  touched={touched.post_logout_redirect_uris} description={t('form_post_logout_redirect_uris_desc')}>
                              <ListInput
                                values={values.post_logout_redirect_uris}
                                placeholder={t('form_type_prompt')}
                                empty={(typeof(errors.post_logout_redirect_uris)==='string')?true:false}
                                name='post_logout_redirect_uris'
                                error={errors.post_logout_redirect_uris}
                                touched={touched.post_logout_redirect_uris}
                                onBlur={handleBlur}
                                onChange={handleChange}
                                integrationEnvironment = {values.integration_environment}
                                setFieldTouched={setFieldTouched}
                                disabled={disabled}
                                changed={props.changes?props.changes.post_logout_redirect_uris:null}
                              />
                            </InputRow>:null 
                          }
                          {oidcResourceIndicatorsEnabled?
                          <InputRow title={t('form_resource_indicators_title')} error={typeof(errors.resource_indicators)==='string'?errors.resource_indicators:null} touched={touched.resource_indicators} description={t('form_resource_indicators_desc')}>
                            <ListInput
                              values={values.resource_indicators}
                              placeholder={t('form_type_prompt')}
                              empty={(typeof(errors.resource_indicators)==='string')?true:false}
                              name='resource_indicators'
                              error={errors.resource_indicators}
                              touched={touched.resource_indicators}
                              onBlur={handleBlur}
                              onChange={handleChange}
                              setFieldTouched={setFieldTouched}
                              disabled={disabled}
                              changed={props.changes?props.changes.resource_indicators:null}
                            />
                          </InputRow>
                          :null}
                          <InputRow  moreInfo={tenant.form_config.more_info.scope} title={t('form_scope')} required={true} description={t('form_scope_desc')} error={typeof(errors.scope)==='string'?errors.scope:null} touched={true}>
                            <CheckboxList
                              name='scope'
                              values={values.scope}
                              disabled={disabled}
                              listItems={oidcScopeOptions}
                              changed={props.changes?props.changes.scope:null}
                            />
                          </InputRow>

                          <InputRow  moreInfo={tenant.form_config.more_info.grant_types} title={t('form_grant_types')} required={true} error={errors.grant_types} touched={true}>
                            <CheckboxList
                              name='grant_types'
                              values={values.grant_types}
                              listItems={oidcGrantTypeOptions}
                              disabled={disabled}
                              changed={props.changes?props.changes.grant_types:null}
                            />
                          </InputRow>
                         
                          <InputRow  moreInfo={tenant.form_config.more_info.token_endpoint_auth_method} title={t('form_token_endpoint_title')} required={true} error={errors.token_endpoint_auth_method||errors.code_challenge_method} touched={touched.token_endpoint_auth_method}>
                            <SimpleRadio
                              name='token_endpoint_auth_method'
                              onChange={handleChange}
                              values={values}
                              setFieldValue={setFieldValue}
                              radio_items={oidcTokenEndpointMethodOptions}
                              radio_items_titles={oidcTokenEndpointMethodTitles}
                              value={values.token_endpoint_auth_method}
                              className={'application-type-container'}
                              disabled={disabled}
                              changed={props.changes?props.changes.token_endpoint_auth_method:null}
                            />
                          </InputRow>
                          <InputRow  moreInfo={tenant.form_config.more_info.allow_introspection} title={t('form_allow_introspection')}>
                            <div className='simple_checkbox_container'>
                              <SimpleCheckbox
                                name='allow_introspection'
                                label={t('form_allow_introspection_desc')}
                                onChange={handleChange}
                                moreinfo={tenant.form_config.more_info.allow_introspection}
                                disabled={disabled||tenant.form_config.dynamic_fields.includes('allow_introspection')}
                                value={values.allow_introspection}
                                changed={props.changes?props.changes.allow_introspection:null}
                              />
                            </div>
                          </InputRow>
                          <InputRow title={t('form_refresh_tokens_title')} required={false} description={t('form_refresh_tokens_desc')} error={errors.refresh_token_validity_seconds} touched={touched.scope || touched.refresh_token_validity_seconds}>
                            <div className='simple_checkbox_container'>
                              <SimpleCheckbox
                                name='issue_refresh_tokens'
                                label={t('form_refresh_tokens_checkbox_label')}
                                checked={values.scope.includes('offline_access')}
                                onChange={(e)=>{
                                  const issueRefreshTokens = e.target.checked;
                                  const currentScopes = Array.isArray(values.scope) ? values.scope : [];
                                  const nextScopes = issueRefreshTokens
                                    ? Array.from(new Set([...currentScopes, 'offline_access']))
                                    : currentScopes.filter((scopeItem)=>scopeItem !== 'offline_access');
                                  setFieldValue('scope', nextScopes, true);
                                  if(issueRefreshTokens && (!values.refresh_token_validity_seconds || Number(values.refresh_token_validity_seconds) === 0)){
                                    setFieldValue('refresh_token_validity_seconds', tenant.form_config.refresh_token_validity_seconds, false);
                                  }
                                }}
                                disabled={disabled}
                                changed={props.changes&&props.changes.scope?(props.changes.scope.D.includes('offline_access')||props.changes.scope.N.includes('offline_access')):false}
                              />
                            </div>
                          </InputRow>
                          <InputRow  moreInfo={tenant.form_config.more_info.device_code_validity_seconds} required={values.grant_types.includes('urn:ietf:params:oauth:grant-type:device_code')} title={t('form_device_code_validity_seconds')} extraClass='time-input' error={errors.device_code_validity_seconds} touched={touched.device_code_validity_seconds}>
                            <DeviceCode
                              onBlur={handleBlur}
                              values={values}
                              setFieldValue={setFieldValue}
                              errors={errors}
                              validateField={validateField}
                              isInvalid={hasSubmitted?!!errors.device_code_validity_seconds:(!!errors.device_code_validity_seconds&&touched.device_code_validity_seconds)}
                              onChange={handleChange}
                              disabled={disabled}
                              changed={props.changes}
                            />
                          </InputRow>
                          <InputRow  moreInfo={tenant.form_config.more_info.code_challenge_method} required={true} title={t('form_pkce_title')} error={errors.code_challenge_method} touched={touched.code_challenge_method}>
                            <SimpleRadio
                              name='code_challenge_method'
                              onChange={handleChange}
                              values={values}
                              setFieldValue={setFieldValue}
                              radio_items={oidcPkceOptions}
                              radio_items_titles={oidcPkceTitles}
                              value={values.code_challenge_method}
                              className={'application-type-container'}
                              disabled={disabled}
                              changed={props.changes?props.changes.code_challenge_method:null}
                            />
                          </InputRow>
                          <InputRow  moreInfo={tenant.form_config.more_info.access_token_validity_seconds} required={true} title={t('form_access_token_validity_seconds')} extraClass='time-input' error={errors.access_token_validity_seconds} touched={touched.access_token_validity_seconds} description={t('form_access_token_validity_seconds_desc')}>
                            <TimeInput
                              name='access_token_validity_seconds'
                              value={values.access_token_validity_seconds}
                              isInvalid={hasSubmitted?!!errors.access_token_validity_seconds:(!!errors.access_token_validity_seconds&&touched.access_token_validity_seconds)}
                              onBlur={handleBlur}
                              onChange={handleChange}
                              disabled={disabled}
                              changed={props.changes?props.changes.access_token_validity_seconds:null}
                            />
                          </InputRow>
                          <InputRow  moreInfo={tenant.form_config.more_info.id_token_timeout_seconds} required={true} title={t('form_id_token_timeout_seconds')} extraClass='time-input' error={errors.id_token_timeout_seconds} touched={touched.id_token_timeout_seconds} description={t('form_id_token_timeout_seconds_desc')}>
                            <TimeInput
                              name='id_token_timeout_seconds'
                              value={values.id_token_timeout_seconds}
                              isInvalid={hasSubmitted?!!errors.id_token_timeout_seconds:(!!errors.id_token_timeout_seconds&&touched.id_token_timeout_seconds)}
                              onBlur={handleBlur}
                              onChange={handleChange}
                              disabled={disabled}
                              changed={props.changes?props.changes.id_token_timeout_seconds:null}
                            />
                          </InputRow>
                        </React.Fragment>
                    :null}
                    {values.protocol==='saml'?
                      <React.Fragment>
                        <ConfirmationModal 
                          active={metadataLoaded.supported_attributes.length>0} 
                          close={()=>{
                            if(metadataLoaded.supported_attributes.length>0){
                              setMetadataLoaded({...metadataLoaded,supported_attributes:[]});
                            }
                          }} 
                          action={()=>{
                            if(metadataLoaded.supported_attributes.length>0){
                              setFieldValue('requested_attributes',metadataLoaded.supported_attributes)
                              setMetadataLoaded({...metadataLoaded,supported_attributes:[]});
                            }
                          }} 
                          title={
                            metadataLoaded.supported_attributes.length>0?"Do you wish to load the requested attributes contained in the Metadata Url?":"" 
                          } 
                          message={
                            metadataLoaded.supported_attributes.length>0?metadataLoaded.supported_attributes.length+ (metadataLoaded.unsupported_attributes.length>0?" out of " + (metadataLoaded.supported_attributes.length+metadataLoaded.unsupported_attributes.length):"")+ " attributes found are supported and can be added in the service configuration." :
                            null } 
                          accept={'Yes'} 
                          decline={'No'}/>
                        <InputRow  moreInfo={tenant.form_config.more_info.entity_id} required={true} title={t('form_entity_id')} description={t('form_entity_id_desc')} error={checkingAvailability?null:errors.entity_id} touched={touched.entity_id}>
                          <SimpleInput
                            name='entity_id'
                            placeholder={t('form_type_prompt')}
                            onChange={(e)=>{
                              setFieldTouched('entity_id');
                              handleChange(e);
                            }}
                            value={values.entity_id}
                            copybutton={props.copybutton}
                            isInvalid={hasSubmitted?!!(errors.entity_id&&!checkingAvailability):(!!errors.entity_id&&touched.entity_id&&!checkingAvailability)}
                            onBlur={handleBlur}
                            disabled={disabled||service_id}
                            changed={props.changes?props.changes.entity_id:null}
                            isloading={values.entity_id&&values.entity_id!==checkedId&&checkingAvailability?1:0}
                           />
                         </InputRow>
                         <InputRow  moreInfo={tenant.form_config.more_info.metadata_url} required={true} title={t('form_metadata_url')} description={t('form_metadata_url_desc')} error={metadataAsyncError||errors.metadata_url} touched={touched.metadata_url}>
                           <MetadataInput
                             name='metadata_url'
                             placeholder='Type something'
                             onChange={(e)=>{
                              setMetadataAyncError('');
                              setMetadataWarning();
                              handleChange(e);}}
                             copybutton={props.copybutton}
                             value={values.metadata_url}
                             isInvalid={hasSubmitted?!!metadataAsyncError||!!errors.metadata_url:((!!metadataAsyncError||!!errors.metadata_url)&&touched.metadata_url)}
                             onBlur={handleBlur}
                             disabled={disabled}
                             getmetadata={(metadata_url)=>{
                              getMetadata(metadata_url,null,(attributes)=>{ setFieldValue('requested_attributes',attributes,false)});
                             }}
                             changed={props.changes?props.changes.metadata_url:null}
                             isloading={values.metadata_url&&metadataLoading?1:0}
                            />
                            <UrlWarning url={values.metadata_url} overwriteWarning={metadataWarning} disableCheck={1} touched={!!values.metadata_url}/>
                          </InputRow>
                          <InputRow title={t('form_saml_attributes_title')} required={true} error={typeof(errors.required_attributes)==='string'?errors.required_attributes:null} touched={true}>
                            <CheckboxList
                              name='required_attributes'
                              values={values.required_attributes || []}
                              listItems={(tenant?.form_config?.saml_ui?.attributes || ['openid','profile','email'])}
                              disabled={disabled}
                              changed={props.changes?props.changes.required_attributes:null}
                            />
                          </InputRow>
                          <InputRow title={t('form_assertion_consumer_service')} error={errors.assertion_consumer_service} touched={touched.assertion_consumer_service}>
                            <SimpleInput
                              name='assertion_consumer_service'
                              placeholder={t('form_url_placeholder')}
                              onChange={handleChange}
                              value={values.assertion_consumer_service || ''}
                              isInvalid={hasSubmitted?!!errors.assertion_consumer_service:(!!errors.assertion_consumer_service&&touched.assertion_consumer_service)}
                              onBlur={handleBlur}
                              disabled={disabled}
                              changed={props.changes?props.changes.assertion_consumer_service:null}
                            />
                          </InputRow>
                          <InputRow title={t('form_single_logout_service')} error={errors.single_logout_service} touched={touched.single_logout_service}>
                            <SimpleInput
                              name='single_logout_service'
                              placeholder={t('form_url_placeholder')}
                              onChange={handleChange}
                              value={values.single_logout_service || ''}
                              isInvalid={hasSubmitted?!!errors.single_logout_service:(!!errors.single_logout_service&&touched.single_logout_service)}
                              onBlur={handleBlur}
                              disabled={disabled}
                              changed={props.changes?props.changes.single_logout_service:null}
                            />
                          </InputRow>
                          <InputRow title={t('form_signing_cert')} error={errors.signing_cert} touched={touched.signing_cert}>
                            <TextAria
                              value={values.signing_cert || ''}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              name='signing_cert'
                              placeholder={t('form_type_prompt')}
                              isInvalid={hasSubmitted ? !!errors.signing_cert : (!!errors.signing_cert && touched.signing_cert)}
                              disabled={disabled}
                              changed={props.changes ? props.changes.signing_cert : null}
                            />
                          </InputRow>
                       </React.Fragment>
                     :null}
                    </Tab>
                    <Tab eventKey="access_control" title={'Access Control'}>
                      <AccessControlTab
                        values={values}
                        errors={errors}
                        touched={touched}
                        setFieldValue={setFieldValue}
                        handleChange={handleChange}
                        handleBlur={handleBlur}
                        disabled={disabled}
                        hasSubmitted={hasSubmitted}
                      />
                    </Tab>
                    <Tab eventKey="managers" title={'Managers'}>
                      <ManagersTab
                        tenantName={tenant_name}
                        serviceId={service_id}
                        serviceName={values.service_name}
                        groupId={values.group_id || props.initialValues.group_id}
                        disabled={disabled}
                      />
                    </Tab>
                  </Tabs>
                  </div>
                  {props.disabled?null:
                    <div className="form-controls-container">
                      {props.review?
                          <ReviewComponent errors={errors} disabled={metadataLoading} asyncErrors={metadataAsyncError} values={values} changes={props.changes} type={props.type} reviewPetition={reviewPetition} restrictReview={restrictReview} />
                        :
                        <React.Fragment>
                        <div className="form-submit-cancel-container">
                          <Button className='submit-button' type="submit" disabled={submitDisabled||metadataLoading||checkingAvailability} variant="primary" ><FontAwesomeIcon icon={faCheckCircle}/>Submit</Button>
                          {props.type==='delete'||props.type==='edit'?<Button variant="danger" onClick={()=>deletePetition()}><FontAwesomeIcon icon={faBan}/>Cancel Request</Button>:null}
                        </div>
                        </React.Fragment>
                      }
                    </div>

                  }
                  <PetitionSubmittedModal modalData={modalData} setModalData={setModalData}/>
                  <SimpleModal isSubmitting={isSubmitting} isValid={!Object.keys(errors).length}/>
                   {/* <Debug/> */}

                </Form>




      </div>
      )}
    </Formik>
    :null}
  </React.Fragment>
  );
}

const ReviewComponent = (props)=>{

  const [type,setType] = useState();
  const [expand,setExpand] = useState(false);
  const [error,setError] = useState(false);
  const [comment,setComment] = useState();
  const [invalidPetition,setInvalidPetition] = useState(false);
  // eslint-disable-next-line
  const { t, i18n } = useTranslation();
  useEffect(()=>{
    let invalid = false;
    for (const attribute in props.errors) {
      if(Array.isArray(props.errors[attribute])){
        for(let i=0;i<props.errors[attribute].length;i++){
          if(props.errors[attribute][i]&&!props.changes[attribute].D.includes(props.values[attribute][i])){
            invalid=true;
          }
        }
      }
      else{
        invalid=true
      }
    }
    setInvalidPetition(invalid||!!props.asyncErrors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[props.errors]);


  const handleReview = () =>{

      if(expand){
        if(type){
          if((type==='changes'&&comment)||type!=='changes'){
            props.reviewPetition(comment,type);
          }
          else{
            setError(t('review_comment_required_msg'));
          }
        }
        else {
          setError(t('review_select_option_msg'));
        }
      }else{
        setError(false);
        setExpand(true);
      }
  }
  return (
    <React.Fragment>
        <Row className="review-button-row">
          <ButtonGroup>
            <Button className="review-button" disabled={expand&&props.disabled} variant="success" onClick={()=> handleReview()}>{expand?t('review_submit'):
              <React.Fragment>
                {t('review')}
                <FontAwesomeIcon icon={faSortDown}/>
              </React.Fragment>
              }</Button>
              {expand?
                <Button variant="success" className="review-button-expand" onClick={()=>setExpand(!expand)}>
                  <FontAwesomeIcon icon={faSortDown}/>
                </Button>:null}

          </ButtonGroup>
          {error&&expand?
            <div className="review-error">
              {error}
            </div>
            :null}

        </Row>
        <Collapse in={expand}>
        <div className="expand-container">
        <div className="review-controls flex-column">
        <Form.Group>
          {props.restrictReview?
            <Row>
              <Col md="auto" className="review-radio-col">
                <Form.Check
                type="radio"
                name="formHorizontalRadios"
                id="formHorizontalRadios4"
                onChange={(e)=>{if(e.target.checked){setType(e.target.value)}}}
                value="request_review"
                checked={type==='request_review'}
                />
              </Col>
              <Col onClick={()=>{
                setType('request_review');
              }}>
                <Row>
                <strong>
                {t('review_request_review')}
                </strong>
                </Row>
                <Row className="review-option-desc">
                {t('review_request_review_desc')}
                </Row>
              </Col>
            </Row>
            :
            <Row>
              <Col md="auto" className="review-radio-col">
              <Form.Check
              type="radio"
              name="formHorizontalRadios"
              id="formHorizontalRadios1"
              disabled={invalidPetition&&props.type!=='delete'}
              onChange={(e)=>{if(e.target.checked){setType(e.target.value)}}}
              value="approve"
              checked={type==='approve'}
              />
              </Col>
              <Col onClick={()=>{
                if(!invalidPetition||props.type==='delete'){
                  setType('approve');
                }
              }}>
              <Row>
              <strong>
              {t('review_approve')}
              </strong>
              {invalidPetition&&props.type!=='delete'?
                <div className="approve-error">
                Invalid Service Configuration, Approve disabled
                </div>:null
              }
              </Row>

              <Row className="review-option-desc">
              {t('review_approve_desc')}
              </Row>
              </Col>
            </Row>
          }
          <Row>
            <Col md="auto" className="review-radio-col">
              <Form.Check
                type="radio"
                name="formHorizontalRadios"
                id="formHorizontalRadios2"
                onChange={(e)=>{if(e.target.checked){setType(e.target.value)}}}
                value="reject"
                checked={type==='reject'}
              />
            </Col>
            <Col onClick={()=>{
                setType('reject');
            }}>
              <Row>
                <strong>
                  {t('review_reject')}
                </strong>
              </Row>
              <Row className="review-option-desc">
                {t('review_reject_desc')}
              </Row>
            </Col>
          </Row>
          <Row>
            <Col md="auto" className="review-radio-col">
              <Form.Check
                type="radio"
                name="formHorizontalRadios"
                id="formHorizontalRadios3"
                onChange={(e)=>{if(e.target.checked){setType(e.target.value)}}}
                value="changes"
                checked={type==='changes'}
              />
            </Col>
            <Col onClick={()=>{
              setType('changes');
            }}>
              <Row>
                <strong>
                  {t('review_changes')}
                </strong>
              </Row>
              <Row className="review-option-desc">
                {t('review_changes_desc')}
              </Row>
            </Col>
          </Row>
        </Form.Group>
      </div>

      <Row>

        <Form.Control
          autoFocus
          maxLength='1024'
          as="textarea"
          rows='7'
          className="comment-input"
          placeholder={t('review_comment_prompt')}
          onChange={e => setComment(e.target.value)}
          value={comment}
        />

      </Row>
    </div>

  </Collapse>

    </React.Fragment>
  );
}





const UrlWarning = (props) => {
  const [active,setActive] = useState(!!props.overwriteWarning);
  

  useEffect(()=>{
    if(!props.overwriteWarning){
      setActive(false);
      clearTimeout(urlCheckTimeout);
      if (props.touched&&props.url&&reg.regSimpleUrl.test(props.url)){      
        const exists = async (url) => {
          const result = await fetch(url, { 
            method: 'HEAD',mode:'no-cors' });
          return result.ok;      
        } 
        urlCheckTimeout = setTimeout(()=>{
          urlCheckTimeoutResponse = setTimeout(()=>{
            setActive(true);
            clearTimeout(urlCheckTimeout);
          },3000)
          exists(props.url).then(result=>{
            clearTimeout(urlCheckTimeoutResponse);
            setActive(false);
          }).catch(err=>{        
            clearTimeout(urlCheckTimeoutResponse);
            setActive(true)
          });
        },1000)
      }  
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[props.url,props.touched]);

  return (
    <React.Fragment>
      {(active&&!props.disableCheck)||props.overwriteWarning?
        <div className='pkce-tooltip'>
          <FontAwesomeIcon icon={faExclamationTriangle}/>
          {props.overwriteWarning||"Url could not be reached, make sure you have provided a valid url."}
        </div>:null
      }
    </React.Fragment>
  )
}
function generateValues(data){
  if(data.protocol==='oidc'){
    if(!data.client_id){
      data.client_id = hex(24);
    }
    if(!data.client_secret && !['none', 'private_key_jwt'].includes(data.token_endpoint_auth_method)){
      data.client_secret = hex(87);
    }
    data.generate_client_secret = true;
  }
  return data
}

function hex(n){
  const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let array = new Uint8Array(n||87);
  window.crypto.getRandomValues(array);
  array = array.map(x => validChars.charCodeAt(x % validChars.length));
  const randomState = String.fromCharCode.apply(null, array);
  return randomState;}

const  generateInput = (props)=>  {
  return (
   <React.Fragment>
    {props.field_data.type==='boolean'?
        <InputRow  
        moreInfo={props.tenant.form_config.more_info[props.field_data.name]} 
        title={props.field_data.title} 
        key={props.field_data.name} 
        required={props.field_data.required.includes(props.values.integration_environment)} 
        error={props.errors[props.field_data.name]?props.errors[props.field_data.name]:null} 
        touched={props.touched[props.field_data.name]}
      > 
      <SimpleCheckbox
      name= {props.field_data.name}
      label={
        <React.Fragment>
          {parse(props.field_data.desc)}
        </React.Fragment>
      }
      moreinfo={props.tenant.form_config.more_info[props.field_data.name]}
      onChange={props.handleChange}
      disabled={props.disabled||(props.field_data.tag==='once'&&props.initialValues[props.field_data.name])}
      value={props.values[props.field_data.name]}
      onBlur={props.handleBlur}
      changed={props.changes?props.changes[props.field_data.name]:null}
      />
      </InputRow>
      :props.field_data.type==='string'?
      <InputRow  
      description={props.field_data.desc}
      moreInfo={props.tenant.form_config.more_info[props.field_data.name]} 
      title={props.field_data.title} 
      key={props.field_data.name} 
      required={props.field_data.required.includes(props.values.integration_environment)} 
      error={props.errors[props.field_data.name]?props.errors[props.field_data.name]:null} 
      touched={props.touched[props.field_data.name]}
    > 
        <SimpleInput
        name={props.field_data.name}
        placeholder={props.field_data.placeholder}
        onChange={props.handleChange}
        value={props.values[props.field_data.name]}
        isInvalid={props.hasSubmitted?!!props.errors[props.field_data.name]:(!!props.errors[props.field_data.name]&&props.touched[props.field_data.name])}
        onBlur={props.handleBlur}
        disabled={props.disabled}
        changed={props.changes?props.changes[props.field_data.name]:null}
      />
      {props.field_data.tag==='url'?
       <UrlWarning url={props.values[props.field_data.name]} touched={props.hasSubmitted||props.touched[props.field_data.name]}/>:null}
    </InputRow>
      :null
      }
    
    </React.Fragment>         
  )
}


function capitalWords(array) {
   let return_array = array.map((item,index)=>{
      var splitStr = item.toLowerCase().split(' ');
      for (var i = 0; i < splitStr.length; i++) {
          // You do not need to check if i is larger than splitStr length, as your for does that for you
          // Assign it back to the array
          splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
      }
      return splitStr.join(' ');
    })
   return return_array
}



export default ServiceForm
