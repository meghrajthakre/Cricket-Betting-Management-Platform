# Cricket Betting Management Platform

A full-stack, role-based cricket betting and operations platform with dedicated dashboards for users, super administrators, sub-companies, and support staff. It includes live match management, odds and session markets, wallet and ledger tracking, bet settlement, user administration, and reporting.

> This project is intended for authorized environments. Ensure that every deployment complies with the gambling, privacy, and financial regulations applicable in its jurisdiction.

## Features

- Role-based access for users, super admins, sub-companies, and support staff
- Live cricket matches, odds markets, session markets, and score controls
- User, admin, and sub-company account management
- Wallet balances, coin transfers, transaction ledgers, and collection reports
- Bet placement, settlement, result handling, and profit/loss reporting
- Manual match and score management for support operators
- JWT authentication, validation, rate limiting, and API authorization
- Responsive React dashboards with light/dark UI support where available
- Unit, integration, load, end-to-end, lint, and production-build checks

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Backend | Node.js, Express, MongoDB, Mongoose, JWT, Zod |
| Frontend | React, Vite, Tailwind CSS, React Router, Axios |
| State & Forms | Zustand, React Hook Form |
| Testing | Node.js Test Runner, Playwright |
| Deployment | Vercel-ready frontend configuration |

## Repository Structure

```text
.
|-- Backend/                         # Node.js and Express REST API
|   |-- src/
|   |   |-- config/                  # MongoDB connection configuration
|   |   |-- data/                    # Seed and dummy application data
|   |   |-- middleware/              # Authentication, roles, errors, rate limits
|   |   |-- modules/                 # Feature-based backend modules
|   |   |   |-- admin/               # Admin accounts and profiles
|   |   |   |-- auth/                # Login and authentication
|   |   |   |-- banner/              # Marquee banner management
|   |   |   |-- bet/                 # Bet placement and settlement
|   |   |   |-- cricket/             # Matches and external odds
|   |   |   |-- ledger/              # Transactions and reports
|   |   |   |-- manual/              # Manual score and market controls
|   |   |   |-- saved-match/         # Saved and in-play matches
|   |   |   |-- session/             # Session markets
|   |   |   |-- sub-company/         # Sub-company accounts and limits
|   |   |   |-- support/             # Support endpoints
|   |   |   |-- user/                # User accounts
|   |   |   `-- wallet/              # Wallet and coin transactions
|   |   |-- utils/                    # Tokens, validation, and helpers
|   |   `-- app.js                    # Express application setup
|   |-- tests/
|   |   |-- unit/                     # Unit tests
|   |   |-- integration/              # API and database tests
|   |   `-- load/                     # HTTP load tests
|   |-- server.js                     # Backend entry point
|   `-- package.json
|
|-- frontend-user/                    # Customer-facing React application
|   |-- public/                       # Static assets
|   |-- src/
|   |   |-- app/                      # Layouts and routes
|   |   |-- features/                 # Auth, matches, bets, ledger, settings
|   |   |-- shared/                   # Shared UI and API clients
|   |   |-- store/                    # Zustand state stores
|   |   `-- main.jsx                  # Application entry point
|   |-- tests/e2e/                    # Playwright tests
|   `-- package.json
|
|-- frontend-superAdmin/              # Super-admin React dashboard
|   |-- src/
|   |   |-- app/                      # Routes, navigation, and layouts
|   |   |-- features/                 # Users, admins, matches, reports
|   |   |-- shared/                   # Shared UI and API clients
|   |   `-- main.jsx
|   `-- package.json
|
|-- frontend-subCompany/              # Sub-company React dashboard
|   |-- src/
|   |   |-- app/                      # Routes and layouts
|   |   |-- features/                 # Users, matches, ledger, reports
|   |   |-- shared/                   # Shared UI and API clients
|   |   `-- main.jsx
|   `-- package.json
|
|-- Support/                          # Match-operations dashboard
|   |-- src/
|   |   |-- app/                      # Support routes and layouts
|   |   |-- features/                 # Auth, dashboard, live match controls
|   |   |-- shared/                   # Common UI, utilities, API client
|   |   `-- main.jsx
|   |-- tests/                        # Score calculation tests
|   `-- package.json
|
|-- scripts/
|   `-- verify.ps1                    # Full repository verification
|-- .github/                          # GitHub configuration
|-- .gitignore
`-- README.md
```

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB instance (a replica set is recommended for transaction-based flows)
- An odds API key if external cricket odds are required

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Configure and start the backend

```bash
cd Backend
npm install
```

Create `Backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/cricket_betting
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=180m

# Optional: external cricket odds
ODDS_API_KEY=
ODDS_API_REGIONS=uk

# Optional: initial super admin used by the seed command
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=replace-with-a-strong-password
```

Start the API:

```bash
npm run dev
```

The backend runs at `http://localhost:5000` by default.

To create the initial super-admin account:

```bash
npm run seed
```

### 3. Start a frontend

Open another terminal and choose the dashboard you want to run:

```bash
cd frontend-user
npm install
```

Create a `.env` file inside that frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

Then start it:

```bash
npm run dev
```

Use the same process for:

- `frontend-superAdmin`
- `frontend-subCompany`
- `Support`

For `Support`, `VITE_APP_NAME` can optionally be added to customize the application name.

> The user frontend contains a few requests that use the server root URL. If an endpoint is duplicated with `/api`, set `VITE_API_URL` according to the API client being used and verify the affected flow locally.

## Available Commands

Run commands from the relevant application directory.

### Backend

```bash
npm run dev              # Start with nodemon
npm start                # Start in normal mode
npm test                 # Run the complete backend test suite
npm run test:integration # Run integration tests
npm run test:load        # Run the HTTP load test
npm run seed             # Seed the initial super admin
```

### Frontends

```bash
npm run dev      # Start the Vite development server
npm run build    # Create a production build
npm run lint     # Run ESLint
npm run preview  # Preview the production build
```

The user frontend also provides `npm run test:e2e`, and the Support dashboard provides `npm test`.

## Verification

On Windows PowerShell, the complete repository check can be run from the project root:

```powershell
.\scripts\verify.ps1
```

This runs backend tests, frontend linting and builds, followed by the user application's Playwright tests.

Database-writing integration tests require a separate test database and are enabled with:

```env
TEST_ALLOW_DB_WRITES=true
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/cricket_betting_test
```

Never point database-writing tests at production data.

## Security Notes

- Never commit `.env` files, credentials, API keys, or JWT secrets.
- Use a strong, unique `JWT_ACCESS_SECRET` in every environment.
- Restrict CORS origins and configure secure cookies before production deployment.
- Use separate databases and credentials for development, testing, and production.
- Review access controls, transaction behavior, and local regulatory requirements before going live.

## Contributing

1. Create a feature branch.
2. Keep changes focused and follow the existing project structure.
3. Run the relevant tests, lint checks, and production builds.
4. Open a pull request with a clear description of the change.
