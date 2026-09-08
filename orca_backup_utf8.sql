--
-- PostgreSQL database dump
--

\restrict EyC79s7bYRaj2QTY0I2Q4JSuPsI06eAWZCmrGgYu4IYkZn1GfVD2C3FVWyKxVav

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: orca
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    display_name character varying(100) NOT NULL,
    password_hash text NOT NULL,
    user_category character varying(64),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO orca;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: orca
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO orca;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: orca
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: orca
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: orca
--

COPY public.users (id, email, display_name, password_hash, user_category, created_at) FROM stdin;
1	postgres-test@orca.local	Postgres Test	pbkdf2_sha256$310000$rJs_qvLlJiCT8GvU4-zjZg$s8TnQ8j7g_UIEUsBrGjyKXpMy6xMr3jLxLcvKCblTwA	fisher_marine_operator	2026-09-08 19:42:11.906757
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: orca
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: orca
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: orca
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict EyC79s7bYRaj2QTY0I2Q4JSuPsI06eAWZCmrGgYu4IYkZn1GfVD2C3FVWyKxVav

