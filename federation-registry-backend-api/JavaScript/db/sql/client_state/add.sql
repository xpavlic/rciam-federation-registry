INSERT INTO client_state (id,state,deployment_type,last_edited)
VALUES (${id},${state},${deployment_type},current_timestamp)
RETURNING *