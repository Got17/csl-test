# Backend authentication API

An Express and PostgreSQL API for OTP registration, login and profile management. For this assessment, the OTP is returned in the API response; no SMS is sent.

## Run locally

Requires Node.js 20.6+, npm and Docker Compose.

Create `.env` from `.env.example` and set `JWT_SECRET` to a random local secret:

```powershell
Copy-Item .env.example .env  # Windows PowerShell
```

```sh
cp .env.example .env        # macOS/Linux
```

Start the database and API:

```sh
npm install
docker compose up -d
npm run db:migrate
npm run dev
```

The API runs at `http://localhost:3000` by default. If migration cannot connect, wait for PostgreSQL to start and retry it.

## Test with Postman

1. Import [the Postman collection](postman/Backend%20API.postman_collection.json).
2. In the collection's **Variables** tab, set `base_url` and a new `phone_number` of 8–15 digits. Save the variables. Check that your active environment does not override them.
3. Send these requests in order:

| Request | Expected result |
| --- | --- |
| **Request OTP - JSON** | `200`; OTP in `data.otp_code`, temporary token in `X-Temporary-Token` |
| **Register with OTP** | `200`; returns an access token |
| **Request OTP for login** | `200`; returns a new OTP and temporary token |
| **Login with OTP** | `200`; returns an access token |
| **Get my profile** | `200`; returns the user's profile |
| **Update my name** | `200`; returns the updated name |
| **Reject phone number update** | `400`; `VALIDATION_ERR_UNKNOWN_FIELD` |
| **Upload profile image** | Select a JPEG, PNG or WebP file in the `image` field; expect `200` and `data.image_url` |

The collection saves OTPs and tokens automatically; check the **Test Results** tab. OTPs expire after one minute, are single-use and are limited to three requests per phone number per rolling hour. Use a new number when repeating registration. The complete collection uses three OTP requests; select an image file before running the upload request.

To view an uploaded image, append `image_url` to the API address, for example `http://localhost:3000/uploads/<filename>.png`.

## Endpoints

| Method | Path | Authorization | Body |
| --- | --- | --- | --- |
| `POST` | `/api/auth/otp` | None | `phone_number` |
| `POST` | `/api/auth/register` | Temporary token | `otp_code`, `name` |
| `POST` | `/api/auth/login` | Temporary token | `otp_code` |
| `GET` | `/api/users/me` | Access token | — |
| `PATCH` | `/api/users/me` | Access token | `name` |
| `POST` | `/api/users/me/image` | Access token | form-data file `image` |

Send tokens as `Authorization: Bearer <token>`. Text requests accept JSON or form-data. Images are limited to 5 MB and 20 million pixels; `UPLOAD_DIRECTORY` changes their storage directory. Error messages support `Accept-Language: lo` or `en` (default).

## Automated checks

Run tests against a separate, **isolated** PostgreSQL database named `csl_otp_test`. This example creates a separate Compose project on port `55441` and uses the credentials and `JWT_SECRET` from `.env`. Choose an unused project name and available port.

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

**macOS/Linux:**

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

The test database role must own its tables and be allowed to create functions and triggers. The database-name guard does not prove isolation. `down` retains the database volume. Some tests intentionally log errors; check the test summary and exit status.

Run `npm run typecheck` and `npm run build` for the other checks. The server prints JSON request logs; use the `X-Request-Id` response header to match a request with error logs. Request bodies, OTPs, phone numbers and tokens are not logged.
