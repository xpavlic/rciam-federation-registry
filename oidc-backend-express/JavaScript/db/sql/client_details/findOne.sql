SELECT client_description,reuse_refresh_tokens,allow_introspection,client_id,client_secret,access_token_validity_seconds,refresh_token_validity_seconds,client_name,logo_uri,policy_uri,clear_access_tokens_on_refresh,code_challenge_method,device_code_validity_seconds FROM client_details
WHERE id=${id} AND requester=${requester} AND is_deleted=false AND model_id IS NULL
