SELECT json_agg(json_build_object(
    'outdated', foo.outdated,
    'service_id', foo.service_id,
    'petition_id', foo.petition_id,
    'service_name', foo.service_name,
    'service_description', foo.service_description,
    'logo_uri', foo.logo_uri,
    'integration_environment', foo.integration_environment,
    'owned', foo.owned,
    'status', foo.status,
    'type', foo.type,
    'group_manager', foo.group_manager,
    'notification', foo.notification,
    'comment', foo.comment,
    'group_id', foo.group_id,
    --'deployment_type', foo.deployment_type,
    'last_edited', foo.last_edited,
    'country', foo.country,
    'website_url', foo.website_url,
    'organization_name', foo.organization_name,
    'owners', (
        SELECT COALESCE(json_agg(v.email), '[]'::json)
        FROM (
            SELECT *
            FROM (
                SELECT *
                FROM group_subs g
                WHERE foo.group_id = g.group_id
            ) as subs
            LEFT JOIN user_info USING (sub)
            WHERE tenant = 'egi'
        ) as v
    ),
    'created_at', foo.created_at,
    'orphan', foo.orphan ${get_tags_filter:raw},
    'clients', foo.clients
)) as list_items,
full_count,
outdated_count,
request_review_count
FROM (SELECT *, COUNT(*) OVER() AS full_count,COUNT(CASE WHEN outdated = true AND petition_id IS NULL AND bar.owned THEN 1 ELSE null END) OVER() AS outdated_count,COUNT(CASE WHEN status = 'request_review' THEN 1 ELSE null END) OVER()
    AS request_review_count
    FROM (
        SELECT DISTINCT
            service_id,
            petition_id,
            service_description,
            logo_uri,
            service_name,
            integration_environment,
            CASE WHEN owned IS NULL THEN false ELSE owned END,
            status,
            type,
            CASE WHEN group_ids.group_manager IS NULL THEN false ELSE group_ids.group_manager END,
            CASE WHEN notification IS NULL THEN false ELSE notification END AS notification,
            comment,
            service_details.group_id,
            deployment_type,
            CASE WHEN petitions.last_edited IS NOT NULL THEN petitions.last_edited ELSE last_edited END,
            outdated
            created_at,
            orphan,
            tags,
            website_url,
            country,
            organizations.name as organization_name,
            (SELECT COALESCE(json_agg(json_build_object(
                        'id', cd.id,
                        'client_name', cd.client_name,
                        'client_description', cd.client_description,
                        'type', cd.type,
                        'protocol', cd.protocol,
                        'state', cd.state,
                        'deployment_type', cd.deployment_type,
                        'created_at', cd.created_at,
                        'outdated', cd.outdated,
                        'last_edited', cd.last_edited,
                        'client_petition_id', SELECT id FROM client_petition_details WHERE client_id = cd.client_id AND service_petition_id = petition_id
                    )), '[]'::json)
                FROM (SELECT *
                FROM (SELECT * FROM client_details cd WHERE cd.service_id = sd.id AND cd.deleted = false ${protocol_filter:raw})
                LEFT JOIN client_details_oidc USING (id)
                LEFT JOIN client_details_saml USING (id)
                RIGHT JOIN client_state ON cd.id = client_state.id ${outdated_filter:raw}) as cd)
            as clients
        FROM ${select_own_service:raw}
        (
            SELECT
                id AS service_id,
                service_description,
                logo_uri,
                service_name,
                deleted,
                requester,
                integration_environment,
                group_id,
                website_url,
                country,
                organization_id,
                CASE WHEN outdated OR EXISTS(SELECT 1 FROM (SELECT * FROM client_details cd WHERE cd.service_id = service_id) LEFT JOIN client_state USING (id) WHERE outdated = true) THEN true ELSE false END as outdated,
                CASE WHEN (
                    SELECT json_agg(v.sub)
                    FROM group_subs v
                    WHERE service_details.group_id = v.group_id
                ) IS NULL THEN true ELSE false END as orphan,
                CASE WHEN (
                    SELECT array_agg(v.tag)
                    FROM service_tags v
                    WHERE service_details.id = v.service_id
                ) IS NULL THEN ARRAY[]::varchar[] ELSE (
                    SELECT array_agg(v.tag)
                    FROM service_tags v
                    WHERE service_details.id = v.service_id
                ) END as tags
            FROM service_details
            WHERE tenant = ${tenant_name} ${integration_environment_filter:raw} ${outdated_filter:raw}
                AND ${protocol_filter:raw != "" ? 'EXISTS(SELECT 1 FROM client_details cpd WHERE cpd.service_petition_id = petition_id ${protocol_filter:raw})' : 'true'}
        ) AS service_details
        --LEFT JOIN service_details_saml ON service_details.service_id = service_details_saml.id
        --LEFT JOIN service_details_oidc ON service_details${select_all:raw}.service_id = service_details_oidc.id
        ${select_all:raw}
        USING (group_id)
        -- RIGHT JOIN service_state as service_state ON service_details.service_id = service_state.id ${outdated_filter:raw}
        LEFT JOIN (
            SELECT
                id AS petition_id,
                status,
                type,
                service_id,
                comment,
                CASE WHEN service_petition_details.comment IS NOT NULL THEN true ELSE false END AS notification,
                last_edited
            FROM service_petition_details
            WHERE reviewed_at IS NULL
        ) AS petitions USING (service_id)
        LEFT JOIN group_subs ON service_details.group_id = group_subs.group_id
        LEFT JOIN user_info ON group_subs.sub = user_info.sub AND user_info.tenant = ${tenant_name}
        LEFT JOIN organizations USING (organization_id)
        WHERE deleted = false ${service_id_filter:raw} ${pending_filter:raw} ${pending_sub_filter:raw} ${search_filter_services:raw} ${orphan_filter_services:raw} ${error_filter_services:raw} ${owner_filter_services:raw} ${tags_filter_services:raw} ${created_before_filter:raw} ${created_after_filter:raw}
        UNION ALL
        SELECT
            service_id,
            petition_id,
            service_description,
            logo_uri,
            service_name,
            integration_environment,
            CASE WHEN group_subs.sub = ${sub} THEN true ELSE false END AS owned,
            status,
            type,
            --state,
            CASE WHEN group_manager IS NULL THEN false ELSE group_manager END,
            notification,
            comment,
            petitions.group_id,
            --deployment_type,
            last_edited,
            outdated,
            client_id,
            entity_id,
            created_at,
            orphan,
            tags,
            website_url,
            country,
            organizations.name as organization_name
            (SELECT COALESCE(json_agg(json_build_object(
                        'id', cp.id,
                        'client_id', cp.client_id,
                        'client_name', cp.client_name,
                        'client_description', cp.client_description,
                        'type', cp.type,
                        'protocol', cp.protocol,
                    )), '[]'::json)
                FROM client_petition_details cp
                WHERE petition_id = cp.service_petition_id ${protocol_filter:raw})
            as clients
        FROM (
            SELECT
                service_id,
                id AS petition_id,
                comment,
                service_description,
                logo_uri,
                service_name,
                integration_environment,
                CASE WHEN service_petition_details.comment IS NOT NULL THEN true ELSE false END AS notification,
                status,
                type,
                --null AS deployment_type,
                --null AS state,
                group_id,
                website_url,
                country,
                organization_id,
                last_edited,
                false as outdated,
                null::timestamp as created_at,
                CASE WHEN (
                    SELECT json_agg(v.sub)
                    FROM group_subs v
                    WHERE service_petition_details.group_id = v.group_id
                ) IS NULL THEN true ELSE false END as orphan,
                ARRAY[]::varchar[] as tags
            FROM service_petition_details
            WHERE reviewed_at IS NULL AND type = 'create' AND tenant = ${tenant_name} ${integration_environment_filter:raw} ${outdated_disable_petitions:raw} ${pending_sub_filter:raw} ${disable_petitions:raw}
                  AND ${protocol_filter:raw != "" ? 'EXISTS(SELECT 1 FROM client_petition_details cpd WHERE cpd.service_petition_id = petition_id ${protocol_filter:raw})' : 'true'}
        ) as petitions
        LEFT JOIN group_subs ON petitions.group_id = group_subs.group_id AND group_subs.sub = ${sub}
        LEFT JOIN user_info ON group_subs.sub = user_info.sub AND user_info.tenant = ${tenant_name}
        LEFT JOIN organizations USING (organization_id)
        ${select_own_petition:raw} ${owner_filter_petition:raw} ${tags_filter_petitions:raw}
    ) as bar ${search_filter_petitions:raw} ${orphan_filter_petitions:raw}
    ORDER BY last_edited DESC ${limit:raw} OFFSET ${offset}
) AS foo
GROUP BY full_count, outdated_count, request_review_count;