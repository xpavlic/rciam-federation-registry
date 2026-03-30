SELECT t1.id as service_id
FROM
    (SELECT id FROM service_details_saml WHERE entity_id=${entity_id} and id != COALESCE(${service_id}, 0))  as t1
    JOIN (SELECT id FROM service_details WHERE tenant=${tenant} AND (integration_environment=${environment} OR ${environment} IS NULL) AND deleted=false) as  t2 USING (id)
UNION
SELECT t1.id as petition_id
FROM
    (SELECT id FROM service_petition_details_saml WHERE entity_id=${entity_id} and id != COALESCE(${petition_id}, 0))  as t1
    JOIN ( SELECT id FROM service_petition_details WHERE reviewed_at IS NULL AND tenant=${tenant} AND (integration_environment=${environment} OR ${environment} IS NULL)) as t2 USING (id)
