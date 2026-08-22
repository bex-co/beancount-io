# Beancount.io Backend

## Overview

The backend is built with Node.js and TypeScript using Koa and GraphQL. It powers the API and background jobs for Beancount.io. Key features include:

- GraphQL APIs served via Apollo Server and Koa
- TypeScript for a type-safe codebase
- PostgreSQL with Drizzle ORM for database operations
- Redis for caching
- Background jobs for data processing

## Project Structure

```
/backend
├── config/         # Configuration files
├── migrations/     # Database migration scripts
├── src/
│   ├── api-gateway/  # API gateway implementation
│   ├── model/        # Data models and database schemas
│   ├── scripts/      # Utility scripts
│   ├── server/       # Server implementation
│   └── shared/       # Shared utilities and components
├── server.ts       # Main entry point
└── package.json    # Project dependencies and scripts
```

## Getting Started

This guide assumes a Unix-like environment. If you are on Windows, see [Run on Windows](#run-on-windows).

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Git

### Setup

1. Clone the repository:

```bash
git clone git@github.com:bex-co/beancount-io.git
cd beancount-io/backend-cluster/backend-v2
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

Create a `.env` file in the backend directory with the necessary environment variables. Required variables include:

```dotenv
POSTGRES_BACKEND_URI=postgresql://user:password@localhost:5432/beancount
REDIS_URI=redis://localhost:6379
FAVA_API_URL=http://localhost:8000
FAVA_API_ADMIN_USER=admin
FAVA_API_ADMIN_PASSWORD=your_password
AUTH_SECRET=your_jwt_secret
# Optional: login/register JWT lifetime in minutes (default 525600 = 365 days)
# AUTH_JWT_EXP_MINUTES=5
```

#### Git over SSH proxy (optional, ADR 0004)

Backend-v2 can serve git over SSH itself instead of Gitea, so that the
main-only rule and every application-layer check apply to SSH as well as HTTP.
It authenticates the client against the keys Gitea holds, then speaks
git-over-HTTP to Gitea with that user's own credentials — no key of ours is
stored or registered anywhere. It stays off unless **both** `SSH_PROXY_ENABLED`
and `SSH_PROXY_HOST_KEY` are set:

```dotenv
SSH_PROXY_ENABLED=false
SSH_PROXY_PORT=2222
SSH_PROXY_HOST_KEY=
```

#### Free-tier directive limit (ADR 0005)

The proxy also enforces the free-tier directive cap, replacing the last Gitea
pre-receive hook. It asks ledger-v2 what the ledger currently counts and refuses
a push whose ledger is already over — the question it *cannot* answer is whether
a push would take it over, because a thin pack carries no object store.

There is no switch. It fails **open** on any error instead: once the hook is
gone, deleting entries through the app is an over-limit user's only way back
under, so a check that failed closed would lock both doors at once.

`SSH_PROXY_HOST_KEY` should hold **Gitea's existing** host private key.
Presenting a new one on a port clients have used before produces
`REMOTE HOST IDENTIFICATION HAS CHANGED` — indistinguishable from an attack —
and git refuses to continue. Retrieve the key with
`_infra/print-ssh-host-key.sh`; it is a private key, so it belongs only in an
uncommitted `.env`.

### Run on Windows

We recommend using the Windows Subsystem for Linux (WSL). After installing WSL,
open a terminal and follow the same installation steps. If you prefer
PowerShell, make sure `nvm` and Git Bash are available before running the
commands.

## Development

### Start the Server

To run the server in development mode:

```bash
yarn start
```

The server will be available at the port specified in your configuration (default: 4104).

### Available Scripts

- `yarn start`: Start the server using ts-node
- `yarn server`: Start the server using Node.js (requires build first)
- `yarn lint`: Run ESLint to check and fix code style issues
- `yarn kill`: Kill the node server occupying port 4104
- `yarn backfill-empty-locale`: Run script to backfill empty locale data
- `yarn backfill-user-activated`: Run script to backfill user activation status

### Job Scheduler

Background jobs are scheduled using node-cron and run automatically when the server starts:

- **JWT Cleanup**: Runs daily at midnight (00:00) to delete expired tokens from PostgreSQL
- **Dev Test Job**: Runs every 5 minutes in development mode (console.log test)

See `src/scheduler/` for implementation details and `src/scheduler/README.md` for information on adding new jobs.

## API Documentation

The backend exposes GraphQL APIs through Apollo Server. You can explore the API schema by running the server and visiting the GraphQL playground.
