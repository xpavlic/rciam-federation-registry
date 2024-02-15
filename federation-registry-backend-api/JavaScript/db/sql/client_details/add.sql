INSERT INTO client_details (service_id, client_description, client_name, protocol)
VALUES (${service_id}, ${client_description}, ${client_name}, ${protocol})
RETURNING *