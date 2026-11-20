# AutoServe frontend

AutoServe gives customers and service-center staff a shared view of vehicle repairs. This folder contains the React, TypeScript, and Vite application.

## Objectives

- Customers register vehicles, request service, manage appointments, approve repairs, and view or download invoices.
- Technicians view assigned work, record diagnoses, select parts, and update repair progress.
- Administrators manage requests, assignments, users, inventory, reports, invoices, and confirmed payments.

The service workflow is: Service Requested → Vehicle Checked In → Diagnosis → Customer Approval → Repair → Completed.

## Requirements

- Node.js 22.12 or later in the Node 22 series.
- pnpm 10; `.mise.toml` specifies pnpm 10.34.3.
- The [backend](../Backend/README.md) and its configured MySQL database running for login and saved application data.

## Start the application

From the project root:

```sh
cd Frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed by Vite. Keep the backend running in a separate terminal.

No frontend environment file is needed for the default local setup. Requests use `/api`, and Vite forwards them to `http://localhost:8080`. If the backend runs elsewhere, create a local `.env` using `.env.example` as a guide:

```properties
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:8080
```

Frontend environment values are not a place for passwords or signing keys.

## Run checks

From `Frontend`:

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Tests cover frontend behavior with mocked requests and static rendering. The build writes `dist/`. Saved integration and acceptance results are described in [TEST/README.md](TEST/README.md).

## Main folders

- `src/pages/`: customer, technician, and admin screens.
- `src/api/`: API calls, session handling, and the shared request function.
- `src/components/`: shared controls, navigation, and charts.
- `src/store/`: account and notification state.
- `tests/`: frontend tests and fixtures.
- `public/`: files served directly, including `robots.txt`.

`node_modules/` and `dist/` are generated locally and are excluded from Git.
