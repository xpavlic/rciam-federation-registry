INSERT INTO client_petition_details (service_petition_id, client_description, client_name, protocol, type)
VALUES (${service_petition_id}, ${client_description}, ${client_name}, ${protocol}, ${type})
RETURNING *