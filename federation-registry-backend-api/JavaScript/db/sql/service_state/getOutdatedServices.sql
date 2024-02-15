SELECT DISTINCT service_details.id as service_id,service_details.service_name,service_details.integration_environment,outdated FROM
(SELECT id,outdated FROM service_state WHERE outdated=true) as foo
LEFT JOIN service_details USING (id)
LEFT JOIN service_petition_details ON foo.id = service_petition_details.service_id AND service_petition_details.reviewed_at IS NULL
WHERE service_petition_details.id IS NULL AND service_details.deleted=false AND service_details.tenant=${tenant}

--TODO + GET OUTDATED CLIENTS

SELECT DISTINCT
    sd.id AS service_id,
    sd.service_name,
    sd.integration_environment,
    sd.outdated,
    json_agg(cd.*) AS outdated_clients
FROM service_details AS sd
LEFT JOIN (SELECT
            cd.service_id,
            json_build_object(
                'id', cd.id,
                'external_id', cd.external_id,
                'client_name', cd.client_name,
                'client_description', cd.client_description,
                'protocol', cd.protocol
            ) AS client_details
            FROM client_details AS cd
            JOIN client_state AS cs ON cd.id = cs.id
            WHERE cs.outdated = true
        ) AS cd ON sd.id = cd.service_id
WHERE sd.outdated = true OR cd.service_id IS NOT NULL
GROUP BY sd.id, sd.service_name, sd.integration_environment, sd.outdated;

