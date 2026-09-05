DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS users;
CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, age int NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE orders (id serial PRIMARY KEY, user_id int NOT NULL REFERENCES users(id), amount numeric(12,2) NOT NULL, currency char(3) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX orders_user_id_idx ON orders(user_id);
