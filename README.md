# Backend authentication API

A TypeScript, Express, PostgreSQL and Sequelize authentication API with OTP requests, registration, login and profile endpoints.

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

Error messages support English and Lao through `Accept-Language`; unsupported or absent languages default to English. Error codes remain the same in both languages.

## Registration and login

Use the temporary JWT returned by the OTP request as a bearer token for `POST /api/auth/register` or `POST /api/auth/login`. Registration accepts `otp_code` and `name`; login accepts `otp_code`. Both return an access token in `data.access_token`. Request a new OTP before each successful authentication.

`ACCESS_TOKEN_TTL_SECONDS` configures the access token lifetime and defaults to 86400 seconds. Invalid temporary tokens return 401. Invalid, expired, replaced or consumed OTPs return 400; after three wrong attempts, subsequent attempts return 429. Registering an existing phone number returns 409, while logging in with an unregistered number returns 404.

## Profile

Send the access token as a bearer token to `GET /api/users/me` to read the authenticated user's profile. Use `PATCH /api/users/me` with a JSON or form-data `name` field to update it. The phone number cannot be updated.

To test in Postman, import the included Backend API collection. Its `base_url`, `phone_number`, `name` and `updated_name` collection variables can be changed before sending requests. Successful requests save the OTP and tokens as collection variables. The collection's complete run registers a user, so use a new phone number when running it again.

## Integration tests

Run `npm test` against an isolated PostgreSQL database named `csl_otp_test` after applying migrations and setting the database environment variables and `JWT_SECRET`. Tests create OTP records and must not target a shared or production database.
