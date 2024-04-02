SELECT json_build_object('service_name', sd.service_name,'service_description',sd.service_description,
						 'logo_uri',sd.logo_uri,'policy_uri',sd.policy_uri,'integration_environment',sd.integration_environment,
						 'client_id',sd.client_id,'allow_introspection',sd.allow_introspection,'code_challenge_method',sd.code_challenge_method,
						 'device_code_validity_seconds',sd.device_code_validity_seconds,'access_token_validity_seconds',sd.access_token_validity_seconds,
						 'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,'refresh_token_validity_seconds',sd.refresh_token_validity_seconds,
						 'client_secret',sd.client_secret,'reuse_refresh_token',sd.reuse_refresh_token,'protocol',sd.protocol,'jwks',sd.jwks,'jwks_uri',sd.jwks_uri,
						 'country',sd.country,'website_url',sd.website_url,'token_endpoint_auth_method',sd.token_endpoint_auth_method,'token_endpoint_auth_signing_alg',sd.token_endpoint_auth_signing_alg,
						 'clear_access_tokens_on_refresh',sd.clear_access_tokens_on_refresh,'id_token_timeout_seconds',sd.id_token_timeout_seconds,'metadata_url',sd.metadata_url
						 ,'entity_id',sd.entity_id,'group_id',sd.group_id,'organization_name',sd.name,'organization_url',sd.url,'organization_id',sd.organization_id,'application_type',sd.application_type,
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
						 'contacts',
						 	(SELECT json_agg(json_build_object('email',v.value,'type',v.type))
							 FROM service_petition_contacts v WHERE sd.id = v.owner_id),
						 'requested_attributes',
						 	(SELECT coalesce(json_agg(json_build_object('friendly_name',v.friendly_name,'name',v.name,'required',v.required,'name_format',v.name_format)), '[]'::json) 
							 FROM service_petition_saml_attributes v WHERE sd.id=v.owner_id)	
						) json
    FROM (SELECT *
	FROM (SELECT * FROM service_petition_details WHERE id=${id} AND reviewed_at IS NULL AND tenant=${tenant}) AS foo
	LEFT JOIN service_petition_details_oidc USING (id)
	LEFT JOIN service_petition_details_saml USING (id)
	LEFT JOIN organizations USING(organization_id)) as sd


--TODO CHECK

SELECT json_build_object('service_name' sd.service_name,
                         'service_description', sd.service_description,
                         'logo_uri', sd.logo_uri,
                         'policy_uri', sd.policy_uri,
                         'integration_environment', sd.integration_environment,
                         'country', sd.country,
                         'website_url', sd.website_url,
                         'group_id', sd.group_id,
                         'organization_name', sd.name,
                         'organization_url', sd.url,
                         'organization_id', sd.organization_id,
                         'requester', sd.requester,
                         'service_id', sd.service_id,
                         'type', sd.type,
                         'comment', sd.comment,
                         'submitted_at', sd.last_edited,
                         'status', sd.status,
                         'reviewed_at', sd.reviewed_at,
                         'aup_uri', sd.aup_uri,
                         'service_boolean',
                                (SELECT CASE WHEN json_agg(json_build_object(v.name,v.value)) IS NULL THEN NULL ELSE json_agg(json_build_object(v.name,v.value)) END
                         		FROM service_petition_boolean v WHERE sd.id = v.petition_id),
                         'contacts',
                                (SELECT json_agg(json_build_object('email',v.value,'type',v.type))
                                FROM service_petition_contacts v WHERE sd.id = v.owner_id),
                         'client_petitions',
                                (SELECT coalesce(json_agg(
                                            json_build_object(
                                                'client_id', cpd.client_id,
                                                'client_name', cpd.client_name,
                                                'client_description', cpd.client_description,
                                                'protocol', cpd.protocol,
                                                'type', cpd.type,

                                                'oidc_client_id', cpd.oidc_client_id,
                                                'allow_introspection', cpd.allow_introspection,
                                                'code_challenge_method', cpd.code_challenge_method,
                                                'token_endpoint_auth_method', cpd.token_endpoint_auth_method,
                                                'token_endpoint_auth_signing_alg', cpd.token_endpoint_auth_signing_alg,
                                                'jwks', cpd.jwks,
                                                'jwks_uri', cpd.jwks_uri,
                                                'device_code_validity_seconds', cpd.device_code_validity_seconds,
                                                'access_token_validity_seconds', cpd.access_token_validity_seconds,
                                                'refresh_token_validity_seconds', cpd.refresh_token_validity_seconds,
                                                'reuse_refresh_token', cpd.reuse_refresh_token,
                                                'clear_access_tokens_on_refresh', cpd.clear_access_tokens_on_refresh,
                                                'id_token_timeout_seconds', cpd.id_token_timeout_seconds,
                                                'client_secret', cpd.client_secret,
                                                'application_type', cpd.application_type,

                                                'entity_id', cpd.entity_id,
                                                'metadata_url', cpd.metadata_url,

                                                'grant_types',
                                                    (SELECT json_agg((v.value))
                                                	FROM client_petition_oidc_grant_types v WHERE cpd.id = v.owner_id),
                                                'scope',
                                                	(SELECT json_agg((v.value))
                                                	FROM client_petition_oidc_scopes v WHERE cpd.id = v.owner_id),
                                                'redirect_uris',
                                                	(SELECT json_agg((v.value))
                                                	FROM client_petition_oidc_redirect_uris v WHERE cpd.id = v.owner_id),
                                                'post_logout_redirect_uris',
                                                	(SELECT json_agg((v.value))
                                                	FROM client_petition_oidc_post_logout_redirect_uris v WHERE cpd.id = v.owner_id),
                                                'requested_attributes',
                                                	(SELECT coalesce(json_agg(json_build_object('friendly_name',v.friendly_name,'name',v.name,'required',v.required,'name_format',v.name_format)), '[]'::json)
                                                	FROM client_petition_saml_attributes v WHERE cpd.id=v.owner_id)
                                            )
                                        ), '[]'::json)
                                    FROM (SELECT *
                                    FROM (SELECT * FROM client_petition_details cpd WHERE cpd.service_petition_id = sd.id)
                                    LEFT JOIN client_petition_details_oidc USING (id)
                                    LEFT JOIN client_petition_details_saml USING (id)) as cpd
                                )
                         ) json
    FROM (SELECT *
    FROM (SELECT * FROM service_petition_details WHERE id=${id} AND reviewed_at IS NULL AND tenant=${tenant}) AS FOO
    LEFT JOIN organizations USING(organization_id)) as sd
