# Veeta API #

Running on Node.js, this app exposes an API for the Veeta app

### How do I get set up? ###
* clone this repo
* install yarn (or npm)
* install node 7.5.0
* run `yarn install`
* create a `config/config.env` file (see structure below)
* set up postgresql DB (see below)
* run `yarn start`

#### config.env ####
```
ENV=development
PORT=3013
SSH_KEY_PATH=
PROD_HOST=
PROD_USER=
PROD_PATH=
COOKIE_SECRET=
COOKIE_DAYS_TOEXPIRE=
PG_HOST=
PG_PORT=
PG_USER=
PG_PASSWORD=
PG_DB=
```

#### Database ####
Set up a PostgreSQL DB (version 9.6 or greater), then create a database:
```sql
CREATE DATABASE veeta_db WITH OWNER = postgres ENCODING = 'UTF8' CONNECTION LIMIT = -1;
REVOKE ALL ON DATABASE veeta_db FROM public;
```
Then, create an admin user and set its permissions:
```sql
CREATE ROLE veeta_admin LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE veeta_db TO veeta_admin;
```
Then, create a schema with the admin user as its owner:
```sql
CREATE SCHEMA veeta AUTHORIZATION veeta_admin;
SET search_path = veeta;
ALTER ROLE veeta_admin IN DATABASE veeta_db SET search_path = veeta;
GRANT USAGE, CREATE ON SCHEMA veeta TO veeta_admin;
```
Then, import a snapshot, or create the essential tables using the `sb_migrations/latest.sql` script.

### Deployment ###
```
shipit production deploy
```
