SELECT json_build_object('id',sd.id,'service_name', sd.service_name,'service_description',sd.service_description,
						 'logo_uri',sd.logo_uri,'policy_uri',sd.policy_uri,'integration_environment',sd.integration_environment,
						 'client_id',sd.client_id,'allow_introspection',sd.allow_introspection,'code_challenge_method',sd.code_challenge_method,
						 'device_code_validity_seconds',sd.device_code_validity_seconds,'access_token_validity_seconds',sd.access_token_validity_seconds,
						 'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,
						 'client_secret',sd.client_secret,'reuse_refresh_tokens',sd.reuse_refresh_tokens,'protocol',sd.protocol,'jwks',sd.jwks,'jwks_uri',sd.jwks_uri,
						 'country',sd.country,'website_url',sd.website_url,'token_endpoint_auth_method',sd.token_endpoint_auth_method,'token_endpoint_auth_signing_alg',sd.token_endpoint_auth_signing_alg,
						 'clear_access_tokens_on_refresh',sd.clear_access_tokens_on_refresh,'id_token_timeout_seconds',sd.id_token_timeout_seconds,'metadata_url',sd.metadata_url
						 ,'entity_id',sd.entity_id,'tenant',sd.tenant,
						 'coc',(SELECT CASE WHEN json_agg(json_build_object(v.name,v.value)) IS NULL THEN NULL ELSE json_agg(json_build_object(v.name,v.value)) END
						 FROM service_coc v WHERE sd.id = v.service_id),
						 'grant_types',
							(SELECT json_agg((v.value))
							 FROM service_oidc_grant_types v WHERE sd.id = v.owner_id),
						 'scope',
						 	(SELECT json_agg((v.value))
							 FROM service_oidc_scopes v WHERE sd.id = v.owner_id),
						 'redirect_uris',
						 	(SELECT json_agg((v.value))
							 FROM service_oidc_redirect_uris v WHERE sd.id = v.owner_id),
						 'contacts',
						 	(SELECT json_agg(json_build_object('email',v.value,'type',v.type))
							 FROM service_contacts v WHERE sd.id = v.owner_id),
							 'owners',
							 (SELECT json_agg((v.sub))
						 		FROM group_subs v WHERE sd.group_id = v.group_id)
							) json
    FROM (SELECT *
	FROM ((SELECT id FROM service_state WHERE state!='deleted') AS bar LEFT JOIN service_details USING (id)) AS foo
	LEFT JOIN service_details_oidc USING (id)
	LEFT JOIN service_details_saml USING (id) WHERE tenant=${tenant}) as sd