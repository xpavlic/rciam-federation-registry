UPDATE service_details SET service_description=${service_description},policy_uri=${policy_uri},service_name=${service_name},logo_uri=${logo_uri},integration_environment=${integration_environment},protocol=${protocol},country=${country},website_url=${website_url},aup_uri=${aup_uri},organization_id=${organization_id} WHERE id=${id} RETURNING id

--TODO CHECK

UPDATE service_details SET service_description=${service_description},policy_uri=${policy_uri},service_name=${service_name},logo_uri=${logo_uri},integration_environment=${integration_environment},country=${country},website_url=${website_url},aup_uri=${aup_uri},organization_id=${organization_id},outdated=${outdated},current_timestamp,created_at=${created_at} WHERE id=${id} RETURNING id