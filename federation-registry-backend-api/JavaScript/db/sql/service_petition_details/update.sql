UPDATE service_petition_details SET service_description=${service_description},service_name=${service_name},logo_uri=${logo_uri},integration_environment=${integration_environment},type=${type},comment=null,country=${country},website_url=${website_url},aup_uri=${aup_uri},last_edited=current_timestamp,status=${status},policy_uri=${policy_uri},organization_id=${organization_id} WHERE id=${id}

--TODO