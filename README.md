# AutoServe — Spring Boot Project Configuration

Generated from [start.spring.io](https://start.spring.io/) project setup.

## Project Metadata

| Setting | Value |
|---|---|
| Build Tool | Maven *(or Gradle — Groovy, if selected instead; confirm before generating)* |
| Language | Java |
| Spring Boot Version | 4.1.1 (latest stable release) |
| Java Version | 25 (LTS) |
| Packaging | Jar |
| Configuration Format | YAML (`application.yml`) |

## Selected Dependencies

| # | Dependency | Category | Purpose in AutoServe |
|---|---|---|---|
| 1 | **Spring Web** | Web | Builds the REST API layer (controllers for Service Requests, Appointments, Work Orders, etc.) using Spring MVC on embedded Tomcat |
| 2 | **Spring Data JPA** | SQL | ORM layer — maps Java entities (User, Vehicle, ServiceRequest, WorkOrder, Invoice, etc.) to relational tables via Hibernate |
| 3 | **MS SQL Server Driver** | SQL | JDBC/R2DBC driver connecting the application to a Microsoft SQL Server / Azure SQL database |
| 4 | **Spring Data MongoDB** | NoSQL | Data access for MongoDB — for flexible/unstructured data such as logs, notes, or activity history |
| 5 | **Java Mail Sender** | I/O | Sends transactional email (e.g. OTP codes, notifications, invoices) via `JavaMailSender` |
| 6 | **Spring Security** | Security | Authentication and role-based access control (Customer / Technician / Admin permissions, enforced server-side) |
| 7 | **Flyway Migration** | SQL | Version-controls the database schema — tracks and applies incremental migrations instead of relying on auto-DDL |
| 8 | **Lombok** | Developer Tools | Reduces boilerplate (getters/setters/constructors) via annotations |
| 9 | **Spring Boot DevTools** | Developer Tools | Fast restarts and LiveReload during local development |
| 10 | **Spring Boot Actuator** | Ops | Exposes health, metrics, and monitoring endpoints (pairs with AWS CloudWatch in production) |

## ⚠️ Notes Before You Generate

A few things worth double-checking against your earlier design decisions before you click **Generate**:

1. **Database mismatch**: Your Section 8.1 tech stack table specified **MySQL**, but this configuration has **MS SQL Server Driver** selected instead. If that was intentional (switching databases), update Section 8.1 and the ER diagram notes to match. If it was accidental, swap this for **MySQL Driver** on the Initializr page.
2. **Kafka is missing**: You listed Kafka as a requirement earlier, but `Spring for Apache Kafka` isn't in this dependency list. Add it if you still plan to use event-driven messaging (e.g. for notifications or service request events).
3. **No AWS starters selected**: None of the `AWS S3` / `AWS SNS` / `AWS SES` / `AWS Secrets Manager` dependencies are present. Since your deployment diagram relies on S3 (photo storage) and SES/SNS (notifications), you'll need to add these — either now via Initializr or manually in `pom.xml` afterward.
4. **No Validation dependency**: `Spring Boot Starter Validation` isn't listed. You'll want this for request DTO validation (`@NotNull`, `@Email`, etc.) on your REST endpoints.
5. **SMS OTP still needs a separate SDK**: As noted earlier, mobile OTP isn't covered by any Initializr dependency — add the AWS SNS SDK or Twilio SDK manually.

---
*Document generated to accompany the AutoServe Software Requirements & Design Document.*
