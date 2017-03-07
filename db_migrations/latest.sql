CREATE TABLE veeta."user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE veeta.user_sessions ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE veeta.user_sessions OWNER to veeta_admin;

CREATE TABLE veeta.users (
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
ALTER TABLE veeta.users OWNER to veeta_admin;

CREATE TABLE veeta.events (
  id character varying NOT NULL,
  user_id character varying NOT NULL,
  title character varying NOT NULL,
  "time" timestamp without time zone NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT "user" FOREIGN KEY (user_id)
    REFERENCES veeta.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE NO ACTION
) WITH ( OIDS = FALSE );
ALTER TABLE veeta.events OWNER to veeta_admin;
CREATE INDEX user_title ON veeta.events USING btree (user_id ASC NULLS LAST, title ASC NULLS LAST);
CREATE INDEX user_time ON veeta.events USING btree (user_id ASC NULLS LAST, "time" DESC NULLS LAST);

CREATE TABLE veeta.event_fields (
  id character varying NOT NULL,
  event_id character varying NOT NULL,
  title character varying NOT NULL,
  type character varying NOT NULL,
  value character varying NOT NULL,
  options jsonb,
  "order" smallint,
  CONSTRAINT event FOREIGN KEY (event_id)
    REFERENCES veeta.events (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) WITH ( OIDS = FALSE );
ALTER TABLE veeta.event_fields OWNER to veeta_admin;

CREATE TABLE veeta.charts (
  user_id character varying NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT "user" FOREIGN KEY (user_id)
    REFERENCES veeta.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
) WITH ( OIDS = FALSE );
ALTER TABLE veeta.charts OWNER to veeta_admin;
