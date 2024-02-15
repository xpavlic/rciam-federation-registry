SELECT json_build_object('id',sd.id,'service_name', sd.service_name,'service_description',sd.service_description,
						 'logo_uri',sd.logo_uri,'policy_uri',sd.policy_uri,'integration_environment',sd.integration_environment,
						 'client_id',sd.client_id,'allow_introspection',sd.allow_introspection,'code_challenge_method',sd.code_challenge_method,
						 'device_code_validity_seconds',sd.device_code_validity_seconds,'access_token_validity_seconds',sd.access_token_validity_seconds,
						 'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,
						 'client_secret',sd.client_secret,'reuse_refresh_token',sd.reuse_refresh_token,'protocol',sd.protocol,'jwks',sd.jwks,'jwks_uri',sd.jwks_uri,
						 'country',sd.country,'website_url',sd.website_url,'token_endpoint_auth_method',sd.token_endpoint_auth_method,'token_endpoint_auth_signing_alg',sd.token_endpoint_auth_signing_alg,
						 'clear_access_tokens_on_refresh',sd.clear_access_tokens_on_refresh,'id_token_timeout_seconds',sd.id_token_timeout_seconds,'metadata_url',sd.metadata_url
						 ,'entity_id',sd.entity_id,'tenant',sd.tenant,'external_id',sd.external_id,'aup_uri',sd.aup_uri,'organization_name',sd.name,'organization_url',sd.url,'organization_id',sd.organization_id,
						 'application_type',sd.application_type,'deployment_type',sd.deployment_type,'created_at',sd.created_at,'grant_types',
							(SELECT json_agg((v.value))
							 FROM service_oidc_grant_types v WHERE sd.id = v.owner_id),
						 'scope',
						 	(SELECT json_agg((v.value))
							 FROM service_oidc_scopes v WHERE sd.id = v.owner_id),
						 'redirect_uris',
						 	(SELECT json_agg((v.value))
							 FROM service_oidc_redirect_uris v WHERE sd.id = v.owner_id),
						 'post_logout_redirect_uris',
						 	(SELECT json_agg((v.value))
							 FROM service_oidc_post_logout_redirect_uris v WHERE sd.id = v.owner_id),
						 'contacts',
						 	(SELECT json_agg(json_build_object('email',v.value,'type',v.type))
							 FROM service_contacts v WHERE sd.id = v.owner_id),
						 'requested_attributes',
						 	(SELECT coalesce(json_agg(json_build_object('friendly_name',v.friendly_name,'name',v.name,'required',v.required,'name_format',v.name_format)), '[]'::json) 
							 FROM service_saml_attributes v WHERE sd.id=v.owner_id)
							) json
    FROM (SELECT *
	FROM ((SELECT id,deployment_type,created_at FROM service_state WHERE state='pending') AS bar LEFT JOIN service_details USING (id)) AS foo
	LEFT JOIN service_details_oidc USING (id)
	LEFT JOIN service_details_saml USING (id)
	LEFT JOIN organizations USING(organization_id)) as sd

--TODO CHECK

SELECT json_build_object('id', sd.id,
                         'service_name', sd.service_name,
                         'service_description', sd.service_description,
                         'tenant', sd.tenant,
                         'logo_uri', sd.logo_uri,
                         'policy_uri', sd.policy_uri,
                         'integration_environment', sd.integration_environment,
                         'country', sd.country,
                         'website_url', sd.website_url,
                         'organization_name', sd.name,
                         'organization_url', sd.url,
                         'organization_id', sd.organization_id,
                         'aup_uri', sd.aup_uri,
                         'service_boolean',
                                (SELECT CASE WHEN json_agg(json_build_object(v.name,v.value)) IS NULL THEN NULL ELSE json_agg(json_build_object(v.name,v.value)) END
                         		FROM service_boolean v WHERE sd.id = v.service_id),
                         'contacts',
                                (SELECT json_agg(json_build_object('email',v.value,'type',v.type))
                                FROM service_contacts v WHERE sd.id = v.owner_id),
                         'created_at',created_at,
                         'clients',
                                (SELECT coalesce(json_agg(
                                            json_build_object(
                                                'id', cd.id,
                                                'external_id', cd.external_id,
                                                'client_name', cd.client_name,
                                                'client_description', cd.client_description,
                                                'protocol', cd.protocol,
                                                'deployment_type', cd.deployment_type,
                                                'created_at', cd.created_at,

                                                'oidc_client_id', cd.oidc_client_id,
                                                'allow_introspection', cd.allow_introspection,
                                                'code_challenge_method', cd.code_challenge_method,
                                                'token_endpoint_auth_method', cd.token_endpoint_auth_method,
                                                'token_endpoint_auth_signing_alg', cd.token_endpoint_auth_signing_alg,
                                                'jwks', cd.jwks,
                                                'jwks_uri', cd.jwks_uri,
                                                'device_code_validity_seconds', cd.device_code_validity_seconds,
                                                'access_token_validity_seconds', cd.access_token_validity_seconds,
                                                'refresh_token_validity_seconds', cd.refresh_token_validity_seconds,
                                                'reuse_refresh_token', cd.reuse_refresh_token,
                                                'clear_access_tokens_on_refresh', cd.clear_access_tokens_on_refresh,
                                                'id_token_timeout_seconds', cd.id_token_timeout_seconds,
                                                'client_secret', cd.client_secret,
                                                'application_type', cd.application_type,

                                                'entity_id', cd.entity_id,
                                                'metadata_url', cd.metadata_url,

                                                'grant_types',
                                                    (SELECT json_agg((v.value))
                                                	FROM client_oidc_grant_types v WHERE cd.id = v.owner_id),
                                                'scope',
                                                	(SELECT json_agg((v.value))
                                                	FROM client_oidc_scopes v WHERE cd.id = v.owner_id),
                                                'redirect_uris',
                                                	(SELECT json_agg((v.value))
                                                	FROM client_oidc_redirect_uris v WHERE cd.id = v.owner_id),
                                                'post_logout_redirect_uris',
                                                	(SELECT json_agg((v.value))
                                                	FROM client_oidc_post_logout_redirect_uris v WHERE cd.id = v.owner_id),
                                                'requested_attributes',
                                                	(SELECT coalesce(json_agg(json_build_object('friendly_name',v.friendly_name,'name',v.name,'required',v.required,'name_format',v.name_format)), '[]'::json)
                                                	FROM client_saml_attributes v WHERE cd.id=v.owner_id)
                                            )
                                        ), '[]'::json)
                                    FROM (SELECT *
                                    FROM (SELECT * FROM client_details cd WHERE cd.service_id = sd.id)
                                    LEFT JOIN client_state USING (id)
                                    LEFT JOIN client_details_oidc USING (id)
                                    LEFT JOIN client_details_saml USING (id)) WHERE state = 'pending' as cd
                                )
                         ) json
    FROM (SELECT * FROM service_details
	LEFT JOIN organizations USING(organization_id)) as sd WHERE jsonb_array_length(client_details) > 0