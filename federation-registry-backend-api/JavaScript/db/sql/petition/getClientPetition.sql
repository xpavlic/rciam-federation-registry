SELECT json_build_object('client_id', cpd.client_id,
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
FROM (SELECT *
FROM (SELECT * FROM client_petition_details cpd WHERE cpd.id = ${id})
LEFT JOIN client_petition_details_oidc USING (id)
LEFT JOIN client_petition_details_saml USING (id)) as cpd
