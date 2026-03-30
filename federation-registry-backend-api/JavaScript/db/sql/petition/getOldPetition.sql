SELECT json_build_object('service_name', sd.service_name,'service_name_czech',sd.service_name_czech,'service_description',sd.service_description,'service_description_czech',sd.service_description_czech,
						 'logo_uri',sd.logo_uri,'policy_uri',sd.policy_uri,'integration_environment',sd.integration_environment,
						 'client_id',sd.client_id,'allow_introspection',sd.allow_introspection,'code_challenge_method',sd.code_challenge_method,
						 'device_code_validity_seconds',sd.device_code_validity_seconds,'access_token_validity_seconds',sd.access_token_validity_seconds,
						 'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,
						 'client_secret',sd.client_secret,'reuse_refresh_token',sd.reuse_refresh_token,'protocol',sd.protocol,'jwks',sd.jwks,'jwks_uri',sd.jwks_uri,
						 'country',sd.country,'website_url',sd.website_url,'service_login_url',sd.service_login_url,'service_login_url_czech',sd.service_login_url_czech,'token_endpoint_auth_method',sd.token_endpoint_auth_method,'token_endpoint_auth_signing_alg',sd.token_endpoint_auth_signing_alg,
						 'clear_access_tokens_on_refresh',sd.clear_access_tokens_on_refresh,'id_token_timeout_seconds',sd.id_token_timeout_seconds,'metadata_url',sd.metadata_url,
						 'entity_id',sd.entity_id,'assertion_consumer_service',sd.assertion_consumer_service,'single_logout_service',sd.single_logout_service,'signing_cert',sd.signing_cert,
						 'check_group_membership',sd.check_group_membership,'require_vo_membership',sd.require_vo_membership,'rp_ensure_membership_desc',sd.rp_ensure_membership_desc,
						 'require_group_membership',sd.require_group_membership,'rp_ensure_group_membership_desc',sd.rp_ensure_group_membership_desc,'create_group',sd.create_group,'allow_registration',sd.allow_registration,'dynamic_registration',sd.dynamic_registration,'registration_url',sd.registration_url,
						 'organization_name',sd.name,'organization_url',sd.url,'organization_id',sd.organization_id,'application_type',sd.application_type,
						 'requester',sd.requester,'service_id',sd.service_id,'type',sd.type,'comment',sd.comment,'submitted_at',sd.last_edited,'status',sd.status,'reviewed_at',sd.reviewed_at,'aup_uri',sd.aup_uri,
						 'service_boolean',(SELECT CASE WHEN json_agg(json_build_object(v.name,v.value)) IS NULL THEN NULL ELSE json_agg(json_build_object(v.name,v.value)) END
						 FROM service_petition_boolean v WHERE sd.id = v.petition_id),
						 'grant_types',
							(SELECT json_agg((v.value))
							 FROM service_petition_oidc_grant_types v WHERE sd.id = v.owner_id),
						 'scope',
						 	(SELECT json_agg((v.value))
							 FROM service_petition_oidc_scopes v WHERE sd.id = v.owner_id),
						 'redirect_uris',
						 	(SELECT json_agg((v.value))
							 FROM service_petition_oidc_redirect_uris v WHERE sd.id = v.owner_id),
						 'post_logout_redirect_uris',
						 	(SELECT json_agg((v.value))
							 FROM service_petition_oidc_post_logout_redirect_uris v WHERE sd.id = v.owner_id),
						 'resource_indicators',
						 	(SELECT json_agg((v.value))
							 FROM service_petition_oidc_resource_indicators v WHERE sd.id = v.owner_id),
						 'rp_blocked_idps_desc',
						 	(SELECT json_agg((v.value))
							 FROM service_petition_rp_blocked_idps_desc v WHERE sd.id = v.owner_id),
						 'rp_only_allowed_idps_desc',
						 	(SELECT json_agg((v.value))
							 FROM service_petition_rp_only_allowed_idps_desc v WHERE sd.id = v.owner_id),
						 'contacts',
						 	(SELECT json_agg(json_build_object('email',v.value,'type',v.type))
							 FROM service_petition_contacts v WHERE sd.id = v.owner_id),
						 'service_policies',
					 	(SELECT coalesce(json_agg(json_strip_nulls(json_build_object('name',v.name,'url',v.url,'url_czech',CASE WHEN v.url_czech IS NOT NULL AND v.url_czech <> v.url THEN v.url_czech ELSE NULL END))), '[]'::json)
						 	 FROM service_petition_policies v WHERE sd.id = v.owner_id),
						 'infrastructures',
						 	(SELECT CASE WHEN array_agg((v.value)) IS NULL THEN Array[]::varchar[] ELSE array_agg((v.value)) END
						 	 FROM service_petition_infrastructures v WHERE sd.id = v.owner_id),
						 'requested_attributes',
						 	(SELECT coalesce(json_agg(json_build_object('friendly_name',v.friendly_name,'name',v.name,'required',v.required,'name_format',v.name_format)), '[]'::json) 
							 FROM service_petition_saml_attributes v WHERE sd.id=v.owner_id),
						 'required_attributes',
						 	(SELECT CASE WHEN array_agg((v.value)) IS NULL THEN Array[]::varchar[] ELSE array_agg((v.value)) END
							 FROM service_petition_saml_required_attributes v WHERE sd.id=v.owner_id)
							) json
    FROM (SELECT *
	FROM (SELECT * FROM service_petition_details WHERE id=${id} AND tenant=${tenant})  AS foo
	LEFT JOIN service_petition_details_oidc USING (id)
	LEFT JOIN service_petition_details_saml USING (id)
	LEFT JOIN organizations USING (organization_id)
) as sd
