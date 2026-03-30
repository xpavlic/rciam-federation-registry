INSERT INTO service_${type:raw}details_saml (id,metadata_url,entity_id,assertion_consumer_service,single_logout_service,signing_cert)
VALUES (${id},${metadata_url},${entity_id},${assertion_consumer_service},${single_logout_service},${signing_cert})
RETURNING *
