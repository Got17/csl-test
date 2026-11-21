# Backend authentication API

A TypeScript, Express, PostgreSQL and Sequelize authentication API. OTP requests are available; registration, login and profile endpoints will follow.

## Requirements

- Node.js 20 or later and npm
- Docker with Docker Compose

## Local setup

1. Copy `.env.example` to `.env`. The values in the example are for local development only.
2. Run `npm install`.
3. Start PostgreSQL with `docker compose up -d` and wait until it is healthy.
4. Apply migrations with `npm run db:migrate`.
5. Start the API in development mode with `npm run dev`.

The application verifies the database connection before accepting requests. The default API port is 3000; configure it and the database connection in `.env`. The Compose database uses a persistent volume.

Run `npm run typecheck` to check types, or `npm run build` followed by `npm start` to run compiled code. Use `npm run db:migrate:undo` to undo the most recent migration.

## Request an OTP

Set `JWT_SECRET` in `.env` to a random secret before requesting an OTP. `TEMP_TOKEN_TTL_SECONDS` configures the temporary token lifetime; it defaults to 300 seconds. Never commit your actual secret.

Send a JSON or form-data request to `POST /api/auth/otp` with `phone_number` as an 8–15 digit string. The fake OTP is returned in `data.otp_code` and a temporary JWT is returned in the `X-Temporary-Token` header. The fake OTP is exposed solely for this assessment; a real deployment must deliver it securely instead.

OTPs expire after one minute. A new request invalidates the prior OTP, and a phone number may request at most three OTPs in a rolling hour.

To test in Postman, import the included Backend API collection. Its `base_url` and `phone_number` collection variables can be changed before sending requests. Successful requests save the temporary token as a collection variable; it expires after the configured temporary token lifetime.

## Integration tests

Run `npm test` against an isolated PostgreSQL database named `csl_otp_test` after applying migrations and setting the database environment variables and `JWT_SECRET`. Tests create OTP records and must not target a shared or production database.
