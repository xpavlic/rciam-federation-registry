SELECT t1.id as service_id
FROM
	(SELECT id FROM service_details_oidc WHERE client_id=${client_id} and id!=${service_id})  as t1
	JOIN (SELECT id FROM service_details WHERE tenant=${tenant} AND integration_environment=${environment} AND deleted=false) as  t2 USING (id)
UNION
SELECT t1.id as petition_id
FROM
	(SELECT id FROM service_petition_details_oidc WHERE client_id=${client_id} and id!=${petition_id})  as t1
	JOIN ( SELECT id FROM service_petition_details WHERE reviewed_at IS NULL AND tenant=${tenant} AND integration_environment=${environment}) as t2 USING (id)

--TODO CHECK

SELECT t1.id as client_id
FROM
    (SELECT id FROM client_details_oidc WHERE oidc_client_id=${oidc_client_id} and id!=${client_id}) as t1
    JOIN client_details AS t2 ON t1.id = t2.id
    JOIN (SELECT id FROM service_details WHERE tenant=${tenant} AND integration_environment=${environment} AND deleted=false) as t3 ON t2.service_id = t3.id
UNION
SELECT t1.id as client_petition_id
FROM
	(SELECT id FROM client_petition_details_oidc WHERE oidc_client_id=${oidc_client_id} and id!=${client_petition_id}) as t1
	JOIN ( SELECT id FROM client_petition_details) AS t2 ON t1.id = t2.id
	JOIN ( SELECT id FROM service_petition_details WHERE reviewed_at IS NULL AND tenant=${tenant} AND integration_environment=${environment}) as t3 ON t2.service_id = t3.id