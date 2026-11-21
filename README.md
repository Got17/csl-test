# Backend authentication API

Project foundation for a TypeScript, Express, PostgreSQL and Sequelize authentication API. Authentication endpoints are not implemented yet.

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
