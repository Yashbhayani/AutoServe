# AutoServe backend

This folder contains the Spring Boot API and database operations used by the AutoServe frontend.

## Objectives

- Handle registration, login, sessions, account roles, and access to customer records.
- Manage vehicles, service requests, appointments, technician assignments, and repair progress.
- Track selected parts and inventory, customer approval, final invoices, confirmed payments, notifications, and reports.

The backend checks permissions and workflow rules before saving changes. Invoice totals include the selected parts and the labor charges entered by an administrator.

## Requirements

- JDK 25.
- Maven 3.9 or later.
- MySQL with the `dev_autoserve` database, base tables, and reference data.

The SQL queries use the `dev_autoserve` schema name. Setting a different database name in the connection URL alone will not change those queries.

## Prepare the database

For a fresh local installation, create `dev_autoserve` and restore the supplied `../autoserve_backup.sql` using your MySQL client. The dump contains table-drop statements, so restore it only into a disposable local database, not a database containing work you need to keep. The backup file itself does not need editing.

`src/main/resources/schema.sql` adds the workflow and billing tables at application startup. It is not a replacement for the base database. Keep any stored procedures used by the existing reporting endpoints installed.

## Configure the backend

Create a local `.env` file inside `Backend` with your own values:

```properties
DB_URL=jdbc:mysql://localhost:3306/dev_autoserve
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_base64_signing_key
SECRET_KEY=your_id_encryption_key
```

`JWT_SECRET` must be Base64 and decode to at least 32 bytes. For a new local setup, use at least 16 ASCII characters for `SECRET_KEY`. Preserve existing keys when using an already configured database. Keep credentials out of Git.

The local email-only password-reset flow is disabled by default. `ALLOW_EMAIL_ONLY_RESET=true` enables it for demonstrations; that flow does not verify ownership of the email address.

## Start the API

From the project root:

```sh
cd Backend
mvn spring-boot:run
```

Run commands from `Backend` so Spring can load its local `.env`. The default address is `http://localhost:8080`. Start the [frontend](../Frontend/README.md) separately.

## Run tests

From `Backend`:

```sh
mvn test
```

The integration tests use isolated H2 fixtures. They do not establish MySQL compatibility. Saved project results and reported manual passes are documented in [Frontend/TEST/README.md](../Frontend/TEST/README.md).

## Main folders

- `src/main/java/`: controllers, services, models, and permission checks.
- `src/main/resources/`: application settings and extension schema.
- `src/test/`: automated tests and database fixtures.
- `.mvn/`, `mvnw`, `mvnw.cmd`: Maven wrapper files.

`target/` is generated build output and is excluded from Git.
