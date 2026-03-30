UPDATE service_${type:raw}details_saml SET metadata_url=${metadata_url},entity_id=${entity_id},assertion_consumer_service=${assertion_consumer_service},single_logout_service=${single_logout_service},signing_cert=${signing_cert}
WHERE id=${id}
