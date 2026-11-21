# Backend authentication API

A TypeScript, Express and PostgreSQL API for OTP registration, login and profile management. The fake OTP is stored in the database and returned in the response for this assessment; no SMS service is required. Optional profile image upload is not implemented.

## Start

Requires Node.js **20.6.0 or later**, npm, Docker Compose and Postman.

Create `.env` from `.env.example` using **Windows PowerShell**:

```powershell
Copy-Item .env.example .env
```

On **macOS/Linux**:

```sh
cp .env.example .env
```

Set `JWT_SECRET` in `.env` to a random secret. Then run:

```sh
npm install
docker compose up -d
npm run db:migrate
npm run dev
```

Wait for PostgreSQL to become healthy if migrations cannot connect immediately. The API defaults to `http://localhost:3000`; PostgreSQL uses host port `5433`.

## Test with Postman

Import [Backend API.postman_collection.json](postman/Backend%20API.postman_collection.json). Set the collection's `base_url` and a **new** `phone_number`, then send these requests in order:

1. **Request OTP - JSON** → saves the OTP and temporary token.
2. **Register with OTP** → saves the access token.
3. **Request OTP for login** → saves a new OTP and temporary token.
4. **Login with OTP** → saves a new access token.
5. **Get my profile**, **Update my name**, and **Reject phone number update**.

The collection also includes form-data and validation examples. It saves tokens in collection variables; check any active Postman environment if those variables are overridden. A full collection run uses three OTP requests, so use a new phone number for each run.

OTPs expire after **one minute**, become invalid when replaced or used, and are limited to **three requests per phone number per rolling hour**. After three wrong entries, further attempts are rejected. Profile endpoints require the access token; the temporary token is only for registration and login.

OTP delivery uses an interface; only the fake implementation is included. A future SMS implementation can be supplied when creating the app and must return the delivered outcome so the response omits the code. Delivery happens after the OTP is saved; if delivery fails, the request remains counted and earlier OTPs stay invalidated.

## Endpoints

| Method | Path | Token | Body |
| --- | --- | --- | --- |
| `POST` | `/api/auth/otp` | None | `phone_number` |
| `POST` | `/api/auth/register` | Temporary | `otp_code`, `name` |
| `POST` | `/api/auth/login` | Temporary | `otp_code` |
| `GET` | `/api/users/me` | Access | — |
| `PATCH` | `/api/users/me` | Access | `name` |

Send tokens as `Authorization: Bearer <token>`. Bodies accept JSON or form-data, and responses contain `error`, `code`, `message` and `data`. Error messages support `Accept-Language: lo` or `en`; English is the default. Unknown fields return `VALIDATION_ERR_UNKNOWN_FIELD`. If a multipart limit is reached before an unknown field is parsed, the invalid-field error takes precedence.

## Automated tests

Use a separate terminal and an **isolated** PostgreSQL database named `csl_otp_test`. The following creates a separate Compose project on port `55441`; choose an available port and an unused project name. It uses the database credentials and `JWT_SECRET` from `.env`.

**Windows PowerShell:**

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_NAME = 'csl_otp_test'
$env:DB_PORT = '55441'
$env:TEMP_TOKEN_TTL_SECONDS = '300'
$env:ACCESS_TOKEN_TTL_SECONDS = '86400'
docker compose -p csl-evaluation-test up -d --wait
npm run db:migrate
npm test
docker compose -p csl-evaluation-test down
```

**macOS/Linux (Bash or Zsh):**

```sh
export DB_HOST='127.0.0.1'
export DB_NAME='csl_otp_test'
export DB_PORT='55441'
export TEMP_TOKEN_TTL_SECONDS='300'
export ACCESS_TOKEN_TTL_SECONDS='86400'
docker compose -p csl-evaluation-test up -d --wait
npm run db:migrate
npm test
docker compose -p csl-evaluation-test down
```

Tests create records, functions and triggers and inspect PostgreSQL activity; the test database role must own the tables and be allowed to create those objects. The database-name guard does not prove isolation. Some tests intentionally log errors; check the test summary and exit status. `down` stops the test container but retains its volume.

Run `npm run typecheck` and `npm run build` for the remaining checks.
