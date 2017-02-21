# Copher API #

Running on Node.js, this app exposes an API for the Copher app

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
CREATE DATABASE copher_db WITH OWNER = postgres ENCODING = 'UTF8' CONNECTION LIMIT = -1;
REVOKE ALL ON DATABASE copher_db FROM public;
CREATE SCHEMA copher;
```
Then, create an admin user and set its permissions:
```sql
CREATE ROLE copher_admin LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE copher_db TO copher_admin;
```
Then, create a schema with the admin user as its owner:
```sql
CREATE SCHEMA copher AUTHORIZATION copher_admin;
SET search_path = copher;
ALTER ROLE copher_admin IN DATABASE copher_db SET search_path = copher;
GRANT USAGE  ON SCHEMA copher TO copher_admin;
GRANT CREATE ON SCHEMA copher TO copher_admin;
```
Then, import a snapshot, or create the essential tables:
```sql
CREATE TABLE "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE copher.user_sessions ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE copher.user_sessions OWNER to copher_admin;

CREATE TABLE copher.users (
  id character varying NOT NULL,
  auth_by character varying NOT NULL,
  login character varying,
  password character varying,
  email character varying,
  name character varying,
  events_version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  CONSTRAINT login UNIQUE (login)
) WITH (OIDS = FALSE);
ALTER TABLE copher.users OWNER to copher_admin;

CREATE TABLE copher.events (
  id character varying NOT NULL,
  user_id character varying NOT NULL,
  title character varying NOT NULL,
  "time" timestamp without time zone NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT "user" FOREIGN KEY (user_id)
    REFERENCES copher.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE NO ACTION
) WITH ( OIDS = FALSE );
ALTER TABLE copher.events OWNER to copher_admin;
CREATE INDEX user_title ON copher.events USING btree (user_id ASC NULLS LAST, title ASC NULLS LAST);
CREATE INDEX user_time ON copher.events USING btree (user_id ASC NULLS LAST, "time" DESC NULLS LAST);

CREATE TABLE copher.event_fields (
  id character varying NOT NULL,
  event_id character varying NOT NULL,
  title character varying NOT NULL,
  type character varying NOT NULL,
  value character varying NOT NULL,
  options jsonb,
  CONSTRAINT event FOREIGN KEY (event_id)
    REFERENCES copher.events (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) WITH ( OIDS = FALSE );
ALTER TABLE copher.event_fields OWNER to copher_admin;
```
### Deployment ###
```
shipit production deploy
```

### Who do I talk to? ###
guy.br7@gmail.com
