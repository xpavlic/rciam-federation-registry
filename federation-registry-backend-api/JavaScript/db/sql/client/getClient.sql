SELECT json_build_object('id', cd.id,
                         'external_id', cd.external_id,
                         'client_name', cd.client_name,
                         'client_description', cd.client_description,
                         'protocol', cd.protocol,
                         'type', cd.type,
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
FROM (SELECT *
FROM (SELECT * FROM client_details cd WHERE cd.id = ${id} AND cd.deleted = false)
LEFT JOIN client_state USING (id)
LEFT JOIN client_details_oidc USING (id)
LEFT JOIN client_details_saml USING (id)) cd