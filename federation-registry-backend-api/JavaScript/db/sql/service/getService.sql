SELECT json_build_object('service_name', sd.service_name,'service_description',sd.service_description,
						 'logo_uri',sd.logo_uri,'policy_uri',sd.policy_uri,'integration_environment',sd.integration_environment,
						 'client_id',sd.client_id,'allow_introspection',sd.allow_introspection,'code_challenge_method',sd.code_challenge_method,
						 'device_code_validity_seconds',sd.device_code_validity_seconds,'access_token_validity_seconds',sd.access_token_validity_seconds,
						 'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,
						 'client_secret',sd.client_secret,'reuse_refresh_tokens',sd.reuse_refresh_tokens,'protocol',sd.protocol,
						 'clear_access_tokens_on_refresh',sd.clear_access_tokens_on_refresh,'id_token_timeout_seconds',sd.id_token_timeout_seconds,'metadata_url',sd.metadata_url
						 ,'entity_id',sd.entity_id,
						 'grant_types',
							(SELECT CASE WHEN array_agg((v.value)) IS NULL THEN Array[]::varchar[] ELSE array_agg((v.value)) END
							 FROM service_oidc_grant_types v WHERE sd.id = v.owner_id),
						 'scope',
						 	(SELECT CASE WHEN array_agg((v.value)) IS NULL THEN Array[]::varchar[] ELSE array_agg((v.value)) END
							 FROM service_oidc_scopes v WHERE sd.id = v.owner_id),
						 'redirect_uris',
						 	(SELECT CASE WHEN array_agg((v.value)) IS NULL THEN Array[]::varchar[] ELSE array_agg((v.value)) END
							 FROM service_oidc_redirect_uris v WHERE sd.id = v.owner_id),
						 'contacts',
						 	(SELECT CASE WHEN array_agg(json_build_object('email',v.value,'type',v.type)) IS NULL THEN Array[]::json[] ELSE array_agg(json_build_object('email',v.value,'type',v.type)) END
							 FROM service_contacts v WHERE sd.id = v.owner_id)
							) json
    FROM (SELECT *
	FROM (SELECT * FROM service_details WHERE id=${id} AND deleted = FALSE AND tenant=${tenant}) AS foo
	LEFT JOIN service_details_oidc USING (id)
	LEFT JOIN service_details_saml USING (id)) as sd