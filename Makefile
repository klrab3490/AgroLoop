# ==============================================================================
# AgroLoop - Master Project Makefile
# Intelligent Waste-to-Resource Platform
# ==============================================================================

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

# Terminal Colors
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
MAGENTA:= \033[35m
BOLD   := \033[1m
RESET  := \033[0m

# Java environment auto-detection (macOS / Linux / Homebrew)
DETECTED_JAVA_HOME := $(shell \
	if [ -n "$$JAVA_HOME" ] && [ -x "$$JAVA_HOME/bin/java" ]; then \
		echo "$$JAVA_HOME"; \
	elif [ -x "/opt/homebrew/opt/openjdk/bin/java" ]; then \
		echo "/opt/homebrew/opt/openjdk"; \
	elif [ -x "/usr/local/opt/openjdk/bin/java" ]; then \
		echo "/usr/local/opt/openjdk"; \
	elif [ -x "/Library/Java/JavaVirtualMachines/openjdk.jdk/Contents/Home/bin/java" ]; then \
		echo "/Library/Java/JavaVirtualMachines/openjdk.jdk/Contents/Home"; \
	elif command -v /usr/libexec/java_home >/dev/null 2>&1; then \
		/usr/libexec/java_home 2>/dev/null; \
	fi)

ifneq ($(DETECTED_JAVA_HOME),)
export JAVA_HOME := $(DETECTED_JAVA_HOME)
export PATH := $(JAVA_HOME)/bin:$(PATH)
endif

# ------------------------------------------------------------------------------
# Help / Overview
# ------------------------------------------------------------------------------
.PHONY: help
help: ## Display this interactive help menu with all available commands
	@echo ""
	@echo -e "$(BOLD)$(GREEN)AgroLoop Automation CLI$(RESET)"
	@echo -e "Platform orchestration, build pipeline, testing, and service lifecycles."
	@echo ""
	@echo -e "$(BOLD)Usage:$(RESET) make $(CYAN)<target>$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / { \
		category = "General"; \
		if ($$1 ~ /^(install|setup)/) category = "Setup & Installation"; \
		else if ($$1 ~ /^(run|dev|start|docker)/) category = "Development & Runtime"; \
		else if ($$1 ~ /^(seed|db)/) category = "Database & Seeding"; \
		else if ($$1 ~ /^(build|package)/) category = "Build & Packaging"; \
		else if ($$1 ~ /^(test|lint|type-check|check)/) category = "Testing & Quality"; \
		else if ($$1 ~ /^(clean)/) category = "Clean & Reset"; \
		printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2 \
	}' $(MAKEFILE_LIST)
	@echo ""

# ------------------------------------------------------------------------------
# Setup & Installation
# ------------------------------------------------------------------------------
.PHONY: install setup install-backend install-clients install-playwright env

env: ## Create .env from .env.example if missing
	@if [ ! -f .env ]; then \
		echo -e "$(YELLOW)Creating .env from .env.example...$(RESET)"; \
		cp .env.example .env; \
	else \
		echo -e "$(GREEN).env already exists.$(RESET)"; \
	fi

install: env install-backend install-clients ## Install all dependencies (Java, Client packages, Playwright)
	@echo -e "$(BOLD)$(GREEN)✓ All AgroLoop dependencies installed successfully.$(RESET)"

setup: install ## Alias for make install

install-backend: ## Download Maven dependencies for Spring Boot backend
	@echo -e "$(CYAN)Resolving backend Maven dependencies...$(RESET)"
	@./mvnw dependency:go-offline -B -q || ./mvnw clean compile -DskipTests -q
	@echo -e "$(GREEN)✓ Backend dependencies ready.$(RESET)"

install-clients: ## Install client monorepo dependencies (web, mobile, desktop, packages)
	@echo -e "$(CYAN)Installing client dependencies with pnpm...$(RESET)"
	@pnpm --dir clients install
	@echo -e "$(GREEN)✓ Client monorepo dependencies installed.$(RESET)"

install-playwright: ## Install Playwright browser binaries for E2E testing
	@echo -e "$(CYAN)Installing Playwright browsers...$(RESET)"
	@pnpm --dir clients exec playwright install chromium
	@echo -e "$(GREEN)✓ Playwright browsers installed.$(RESET)"

# ------------------------------------------------------------------------------
# Development & Runtime
# ------------------------------------------------------------------------------
.PHONY: dev run-backend run-web run-desktop run-mobile run-all
.PHONY: docker-up docker-down docker-db docker-tunnel docker-logs

docker-db: ## Start local PostgreSQL container (with pgvector)
	@echo -e "$(CYAN)Starting PostgreSQL database container...$(RESET)"
	@docker compose up -d postgres
	@echo -e "$(GREEN)✓ PostgreSQL is up on localhost:5432$(RESET)"

run-backend: docker-db ## Start Spring Boot server on http://localhost:8080
	@echo -e "$(BOLD)$(GREEN)Starting AgroLoop Spring Boot API Server (port 8080)...$(RESET)"
	@./mvnw spring-boot:run

dev-backend: run-backend ## Alias for run-backend

run-web: ## Start Next.js web application on http://localhost:3000
	@echo -e "$(BOLD)$(GREEN)Starting Next.js Web App (port 3000)...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/web dev

dev-web: run-web ## Alias for run-web

run-desktop: ## Start Tauri desktop client in development mode
	@echo -e "$(BOLD)$(GREEN)Starting AgroLoop Desktop App (Vite + Tauri)...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/desktop tauri dev

dev-desktop: run-desktop ## Alias for run-desktop

run-mobile: ## Start Expo mobile bundler on port 8082 (avoiding Docker port collision)
	@echo -e "$(BOLD)$(GREEN)Starting Expo Metro Bundler for iOS/Android (port 8082)...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/mobile exec expo start -c --port 8082

dev-mobile: run-mobile ## Alias for run-mobile

dev: ## Start backend and client services together (via Docker + local web)
	@echo -e "$(BOLD)$(CYAN)Starting AgroLoop full development environment...$(RESET)"
	@docker compose up -d postgres
	@echo -e "$(YELLOW)PostgreSQL running. You can now run 'make run-backend' and 'make run-web' in separate tabs, or use 'make docker-up'.$(RESET)"

docker-up: ## Launch entire platform via Docker Compose (Postgres, Spring Boot API, Web)
	@echo -e "$(BOLD)$(GREEN)Spinning up AgroLoop Docker stack...$(RESET)"
	@docker compose up -d
	@echo -e "$(GREEN)✓ Stack running: Web on :3000, API on :8080, DB on :5432$(RESET)"

docker-down: ## Stop and remove all AgroLoop Docker containers
	@echo -e "$(YELLOW)Stopping AgroLoop Docker containers...$(RESET)"
	@docker compose down
	@echo -e "$(GREEN)✓ Docker stack stopped.$(RESET)"

docker-tunnel: ## Start ngrok public tunnel service for mobile/webhook testing
	@echo -e "$(CYAN)Starting ngrok tunnel service...$(RESET)"
	@docker compose --profile tunnel up -d ngrok
	@echo -e "$(GREEN)✓ ngrok web inspector available at http://localhost:4040$(RESET)"

docker-logs: ## Follow Docker container logs in real time
	@docker compose logs -f

# ------------------------------------------------------------------------------
# Database & Seeding
# ------------------------------------------------------------------------------
.PHONY: seed seed-db db-seed

seed-db: ## Seed PostgreSQL database with Fleet and Marketplace dummy data
	@bash ./scripts/seed-data.sh

seed: seed-db ## Alias for seed-db

db-seed: seed-db ## Alias for seed-db

# ------------------------------------------------------------------------------
# Build & Packaging
# ------------------------------------------------------------------------------
.PHONY: build build-backend build-clients build-web build-desktop build-mobile

build: build-backend build-clients ## Build production artifacts for backend and all client packages
	@echo -e "$(BOLD)$(GREEN)✓ Full system production build completed successfully.$(RESET)"

build-backend: ## Package Spring Boot executable JAR in target/
	@echo -e "$(CYAN)Building Spring Boot backend JAR...$(RESET)"
	@./mvnw clean package -DskipTests
	@echo -e "$(GREEN)✓ Backend JAR built: target/agroloop-backend-1.0.0.jar$(RESET)"

build-clients: ## Build all client packages via Turborepo
	@echo -e "$(CYAN)Building client applications with Turborepo...$(RESET)"
	@pnpm --dir clients turbo build
	@echo -e "$(GREEN)✓ All client packages built.$(RESET)"

build-web: ## Build Next.js standalone web production bundle
	@echo -e "$(CYAN)Building Next.js web application...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/web build
	@echo -e "$(GREEN)✓ Next.js web build ready in clients/web/.next/standalone$(RESET)"

build-desktop: ## Build native Tauri desktop application (platform-native bundle: .dmg, .app, .deb, or .exe)
	@echo -e "$(CYAN)Compiling native Desktop bundle with Tauri...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/desktop tauri build
	@echo -e "$(GREEN)✓ Native desktop bundle ready in clients/desktop/src-tauri/target/release/bundle/$(RESET)"

build-desktop-linux: ## Build Linux Tauri desktop packages (.deb, .AppImage)
	@echo -e "$(CYAN)Compiling Linux Desktop packages with Tauri...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/desktop tauri build --target x86_64-unknown-linux-gnu || pnpm --dir clients --filter=@agroloop/desktop tauri build
	@echo -e "$(GREEN)✓ Linux desktop packages ready in clients/desktop/src-tauri/target/release/bundle/$(RESET)"

build-desktop-windows: ## Build Windows Tauri desktop packages (.msi, .exe)
	@echo -e "$(CYAN)Compiling Windows Desktop packages with Tauri...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/desktop tauri build --target x86_64-pc-windows-msvc || pnpm --dir clients --filter=@agroloop/desktop tauri build
	@echo -e "$(GREEN)✓ Windows desktop packages ready in clients/desktop/src-tauri/target/release/bundle/$(RESET)"

build-mobile: ## Export Expo mobile bundle
	@echo -e "$(CYAN)Exporting Expo mobile client...$(RESET)"
	@pnpm --dir clients --filter=@agroloop/mobile export
	@echo -e "$(GREEN)✓ Mobile export complete in clients/mobile/dist/$(RESET)"

# ------------------------------------------------------------------------------
# Testing & Quality Assurance
# ------------------------------------------------------------------------------
.PHONY: test test-backend test-clients test-e2e test-e2e-ui lint type-check check audit

type-check: ## Run TypeScript type checks across all client packages
	@echo -e "$(CYAN)Running TypeScript type checks...$(RESET)"
	@pnpm --dir clients turbo type-check
	@echo -e "$(GREEN)✓ TypeScript validation passed.$(RESET)"

lint: ## Run linters across client packages
	@echo -e "$(CYAN)Running linters...$(RESET)"
	@pnpm --dir clients turbo lint
	@echo -e "$(GREEN)✓ Linting checks passed.$(RESET)"

test-backend: ## Run Spring Boot JUnit 5 backend tests
	@echo -e "$(CYAN)Running backend JUnit test suite...$(RESET)"
	@./mvnw test
	@echo -e "$(GREEN)✓ Backend tests passed.$(RESET)"

test-clients: ## Run Vitest test suite across all client packages
	@echo -e "$(CYAN)Running client Vitest test suites...$(RESET)"
	@pnpm --dir clients turbo test
	@echo -e "$(GREEN)✓ Client test suites passed.$(RESET)"

test: test-backend test-clients ## Run all backend and client test suites
	@echo -e "$(BOLD)$(GREEN)✓ All backend and client tests passed.$(RESET)"

test-e2e: ## Run Playwright end-to-end tests for Web and Desktop
	@echo -e "$(CYAN)Running Playwright E2E suites...$(RESET)"
	@pnpm --dir clients test:e2e
	@echo -e "$(GREEN)✓ E2E tests passed.$(RESET)"

test-e2e-ui: ## Launch Playwright interactive UI test runner
	@pnpm --dir clients test:e2e:ui

audit: ## Check client packages for security vulnerabilities
	@echo -e "$(CYAN)Auditing dependencies for security advisories...$(RESET)"
	@pnpm --dir clients audit
	@echo -e "$(GREEN)✓ Zero security vulnerabilities found.$(RESET)"

check: type-check lint test ## Run complete quality gate (type-check, lint, tests)
	@echo -e "$(BOLD)$(GREEN)✓ Complete quality check passed.$(RESET)"

# ------------------------------------------------------------------------------
# Clean & Reset
# ------------------------------------------------------------------------------
.PHONY: clean clean-all

clean: ## Remove build outputs, caches, and temp artifacts
	@echo -e "$(YELLOW)Cleaning build artifacts...$(RESET)"
	@rm -rf target clients/web/.next clients/desktop/dist clients/desktop/src-tauri/target/release clients/mobile/dist clients/**/.turbo
	@./mvnw clean -q 2>/dev/null || true
	@echo -e "$(GREEN)✓ Clean complete.$(RESET)"

clean-all: clean ## Deep clean: remove node_modules and Docker volumes
	@echo -e "$(YELLOW)Performing deep clean...$(RESET)"
	@docker compose down -v 2>/dev/null || true
	@rm -rf node_modules clients/node_modules clients/**/node_modules
	@echo -e "$(GREEN)✓ Deep clean complete. Run 'make install' to reinstall.$(RESET)"
