# Module 01: Project Setup & Baseline Architecture

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

The objective of **Phase 1: Project Setup** was to establish a resilient, production-ready foundation for AgroLoop using **Spring Boot 3.3.4**, **Java 21/26**, and **PostgreSQL** running in Docker.

This phase ensures that:
- Any developer (Windows, macOS, or Linux) can clone the repository and run the application with a single command.
- Database connectivity is verified at application bootstrap with automated health checks.
- A baseline Thymeleaf web interface provides immediate visual diagnostics of the runtime environment.

---

## 2. Object-Oriented Principles Applied

Even at the setup stage, OOP principles guide our system components:

- **Encapsulation:**
  - Configuration properties (`application.properties`) encapsulate database credentials, upload directories, and server port settings without exposing hardcoded environment values.
- **Abstraction:**
  - The `HomeController` interacts with a javax `DataSource` abstraction rather than establishing raw socket connections to PostgreSQL, keeping data access insulated.
- **Modularity:**
  - Separation between Web MVC controllers (`com.agroloop.controller`), configuration beans (`com.agroloop.config`), and view templates (`src/main/resources/templates`).

---

## 3. Implementation Details

### Maven Configuration (`pom.xml`)
- Parent: `spring-boot-starter-parent` 3.3.4
- Java Version: 21 (Temurin)
- Core Starters:
  - `spring-boot-starter-web` (REST & MVC)
  - `spring-boot-starter-thymeleaf` (Template rendering)
  - `spring-boot-starter-data-jpa` (Hibernate ORM)
  - `postgresql` (JDBC Driver)
  - `spring-boot-starter-validation` (Bean Validation)
  - `spring-boot-devtools` (Live reload)
  - `spring-boot-starter-test` (Testing framework)

### Containerization (`Dockerfile` & `docker-compose.yml`)
- Multi-stage Dockerfile:
  - Stage 1 (`builder`): Compiles source code with Maven in an isolated container.
  - Stage 2 (`runtime`): Uses lightweight `eclipse-temurin:21-jre-alpine` running under a dedicated non-root user (`agroloop:agroloop`).
- Docker Compose:
  - Orchestrates both PostgreSQL and the Spring Boot Java server with bridge networking and service healthchecks (`pg_isready`).

### Cross-Platform Scripts
- **macOS / Linux:** `run.sh` and `./mvnw` with executable permissions.
- **Windows:** `run.bat` and `mvnw.cmd` with CRLF line ending normalization via `.gitattributes`.

---

## 4. Verification & Testing

- `AgroLoopApplicationTests`: Validates Spring `ApplicationContext` bootstrapping and database connection pool creation.
- `HomeControllerTest`: Uses `MockMvc` to verify HTTP 200 responses, Thymeleaf model bindings, and database connection status indicators.

---

[← Back to Master Documentation Hub](../INDEX.md)
