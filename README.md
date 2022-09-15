# Introduction

The federation registry provides a secure web interface through which service operators can register and manage their
OpenID Connect and SAML based service. A federation registry instance can serve multiple tenants and supports different
AAI proxy technologies([Keycloak](https://www.keycloak.org/), [SimpleSAMLphp](https://simplesamlphp.org/), [SATOSA](https://daasi.de/en/satosa-a-modular-proxy/)
(TODO), [MITREid Connect](https://github.com/mitreid-connect/)). Services can be managed through the portal and are
deployed by sending configuration messages to [deployment agents](https://github.com/rciam/rciam-federation-registry-agent)
that run in parallel with this project. Messages are exchanged using [ARGO Messaging Service](https://grnet.gr/en/services/computing-and-storage-services/argo-messaging-service/).

Federation registry is consisted of three node.js projects:

- federation-registry-frontend: A front-end portal created with ReactJS
- federation-registry-backend-api: An API created with Express.js
- federation-registry-backend-ams-agent: An agent that uses the api and communicates with ams

## Running the project

### Dependencies

Federation registry requires [Nodejs](https://nodejs.org/en/) and a [PostgreSQL](https://www.postgresql.org/) database
to run.
Versions used in project development:

- node v13.14.0
- PostgreSQL 12.4

### Database

A PostgreSQL database should be created using the schema described in **_db_schema.sql_**

### Configuration

If we need to set the project to communicate with deployment agents we will need the following from the ams setup:

- the base url of the ams installation
- the project name
- a user token with access to the publish topics
- a verification hash for the push endpoint
- an authorization key for the push endpoint

\*Note: Default values are configured for a local installation

#### 1) Backend API

**Configure Environment File**
`federation-registry-backend-api/JavaScript/.env`

```shell
REACT_BASE=base_frontend_url
EXPRESS_BASE=base_api_url
AMS_AGENT_KEY=authentication_key_for_ams_agent
REDIRECT_URI=redirection_uri_after_login
AMS_AUTH_KEY=authorization_key_for_push_subscription
AMS_VER_HASH=verification_hash_used_to_activate_push_subscription
```

**Configure Database File**
`federation-registry-backend-api/db-config/db-config.json`

```json
{
  "database": "federation_registry_db",
  "host": "localhost",
  "password": "postgres",
  "port": 5432,
  "user": "postgres"
}
```

#### 2) Front End

For the frontend we just need to configure where the backend api is located:
`federation-registry-frontend/src/config.json`

```json
{
  "host": "api_base_url"
}
```

#### **3) AMS Agent**

To configure the ams we must set the environmental variables:

```shell
AMS_PROJECT=ams-project
AMS_BASE_URL=ams-url
AMS_USER_TOKEN=user-token
EXPRESS_URL=base-url-api
EXPRESS_KEY=authentication_key_for_ams_agent
ENV=installation_environment
```

### Installing Node Modules

Install node modules for all three node projects:

```shell
$ cd federation-registry-backend-api
$ npm install
$ cd ../federation-registry-frontend
$ npm install
$ cd ../federation-registry-backend-ams-agent
$ npm install
```

### Run the project

To run the federation-registry-backend-api:

```shell
$ cd federation-registry-backend-api/JavaScript
$ node index.js
```

To run the federation-registry-frontend:

```shell
$ cd federation-registry-frontend
$ npm start
```

To run the federation-registry-backend-ams-agent:

```shell
$ cd federation-registry-backend-ams-agent
$ node app.js
```
