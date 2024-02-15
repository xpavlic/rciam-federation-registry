SELECT DISTINCT email,name as username,user_info.tenant,service_details.id as service_id,service_details.service_name,service_details.integration_environment FROM
(SELECT id FROM service_state WHERE outdated=true) as foo
LEFT JOIN service_details USING (id)
LEFT JOIN service_petition_details ON foo.id = service_petition_details.service_id AND service_petition_details.reviewed_at IS NULL
INNER JOIN group_subs on group_subs.group_id=service_details.group_id
LEFT JOIN user_info ON (user_info.sub=group_subs.sub AND user_info.tenant=service_details.tenant) WHERE email IS NOT NULL AND service_petition_details.id IS NULL AND service_details.deleted=false AND service_details.tenant=${tenant} ${integration_environment_filter:raw}

--TODO

SELECT DISTINCT
    ui.email,
    ui.name AS username,
    ui.tenant,
    sd.id AS service_id,
    sd.service_name,
    sd.integration_environment,
    json_agg(cd.*) AS outdated_clients
FROM service_details AS sd
LEFT JOIN service_petition_details AS spd ON sd.id = spd.service_id AND spd.reviewed_at IS NULL
INNER JOIN group_subs AS gs ON gs.group_id = sd.group_id
LEFT JOIN user_info AS ui ON (ui.sub = gs.sub AND ui.tenant = sd.tenant)
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
WHERE ui.email IS NOT NULL AND spd.id IS NULL AND sd.deleted = false AND (sd.outdated = true OR cd.service_id IS NOT NULL) AND sd.tenant = ${tenant} ${integration_environment_filter:raw}
GROUP BY ui.email, ui.name, ui.tenant, sd.id, sd.service_name, sd.integration_environment;
