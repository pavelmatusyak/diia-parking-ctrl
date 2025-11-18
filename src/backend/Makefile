.PHONY: help install dev build up down restart logs shell db-shell redis-shell test lint format clean migrate migrate-create migrate-up migrate-down seed health docs

# Variables
PYTHON := python3
PIP := pip3
DOCKER_COMPOSE := docker-compose
APP_CONTAINER := parking-violations-api
DB_CONTAINER := parking-violations-db
REDIS_CONTAINER := parking-violations-redis

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ Help

help: ## Display this help message
	@echo "$(BLUE)Parking Violation Reporter - Backend$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development Setup

install: ## Install Python dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	$(PIP) install -r requirements.txt
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

install-dev: install ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	$(PIP) install pytest pytest-asyncio pytest-cov black ruff mypy
	@echo "$(GREEN)✓ Development dependencies installed$(NC)"

setup: ## Initial project setup
	@echo "$(BLUE)Setting up project...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)⚠ Created .env file - please update with your settings$(NC)"; \
	fi
	@make install
	@echo "$(GREEN)✓ Setup complete$(NC)"

##@ Docker Commands

build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build
	@echo "$(GREEN)✓ Images built$(NC)"

up: ## Start all services
	@echo "$(BLUE)Starting all services...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@make health

down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(NC)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(BLUE)Restarting services...$(NC)"
	$(DOCKER_COMPOSE) restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

logs: ## Show logs from all services
	$(DOCKER_COMPOSE) logs -f

logs-api: ## Show API logs
	$(DOCKER_COMPOSE) logs -f api

logs-db: ## Show database logs
	$(DOCKER_COMPOSE) logs -f db

logs-redis: ## Show Redis logs
	$(DOCKER_COMPOSE) logs -f redis

logs-celery: ## Show Celery worker logs
	$(DOCKER_COMPOSE) logs -f celery_worker

ps: ## Show running containers
	$(DOCKER_COMPOSE) ps

##@ Shell Access

shell: ## Access API container shell
	@echo "$(BLUE)Opening shell in API container...$(NC)"
	$(DOCKER_COMPOSE) exec api /bin/bash

db-shell: ## Access PostgreSQL shell
	@echo "$(BLUE)Opening PostgreSQL shell...$(NC)"
	@echo "$(YELLOW)Note: Database is accessible on localhost:5440 from host machine$(NC)"
	$(DOCKER_COMPOSE) exec db psql -U postgres -d parking_violations

redis-shell: ## Access Redis CLI
	@echo "$(BLUE)Opening Redis CLI...$(NC)"
	$(DOCKER_COMPOSE) exec redis redis-cli

python-shell: ## Open Python shell with app context
	@echo "$(BLUE)Opening Python shell...$(NC)"
	$(DOCKER_COMPOSE) exec api python

##@ Local Development

dev: ## Run API locally with auto-reload
	@echo "$(BLUE)Starting development server...$(NC)"
	uvicorn main:app --reload --host 0.0.0.0 --port 8021

dev-celery: ## Run Celery worker locally
	@echo "$(BLUE)Starting Celery worker...$(NC)"
	celery -A foundation.celery_app worker --loglevel=info

dev-beat: ## Run Celery beat locally
	@echo "$(BLUE)Starting Celery beat...$(NC)"
	celery -A foundation.celery_app beat --loglevel=info

demo: ## Run Streamlit chat demo
	@echo "$(BLUE)Starting Streamlit demo app...$(NC)"
	@echo "$(GREEN)Opening http://localhost:8501$(NC)"
	streamlit run streamlit_chat_demo.py

##@ Database Management

migrate: migrate-up ## Alias for migrate-up

migrate-create: ## Create a new migration
	@read -p "Enter migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"
	@echo "$(GREEN)✓ Migration created$(NC)"

migrate-up: ## Apply all migrations
	@echo "$(BLUE)Applying migrations...$(NC)"
	alembic upgrade head
	@echo "$(GREEN)✓ Migrations applied$(NC)"

migrate-down: ## Rollback last migration
	@echo "$(YELLOW)Rolling back last migration...$(NC)"
	alembic downgrade -1
	@echo "$(GREEN)✓ Migration rolled back$(NC)"

migrate-history: ## Show migration history
	alembic history

migrate-current: ## Show current migration
	alembic current

db-reset: ## Reset database (WARNING: destructive)
	@echo "$(RED)⚠ WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(DOCKER_COMPOSE) down -v; \
		$(DOCKER_COMPOSE) up -d db; \
		sleep 3; \
		make migrate-up; \
		echo "$(GREEN)✓ Database reset complete$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	$(PYTHON) scripts/seed_db.py
	@echo "$(GREEN)✓ Database seeded$(NC)"

##@ Testing

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	pytest -v

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	pytest tests/unit -v

test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(NC)"
	pytest tests/integration -v

test-cov: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	pytest --cov=. --cov-report=html --cov-report=term
	@echo "$(GREEN)✓ Coverage report generated in htmlcov/$(NC)"

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	pytest-watch

##@ Code Quality

format: ## Format code with ruff
	@echo "$(BLUE)Formatting code...$(NC)"
	ruff format .
	@echo "$(GREEN)✓ Code formatted$(NC)"

lint: ## Lint code with ruff
	@echo "$(BLUE)Linting code...$(NC)"
	ruff check .

lint-fix: ## Lint and auto-fix issues
	@echo "$(BLUE)Linting and fixing code...$(NC)"
	ruff check . --fix
	@echo "$(GREEN)✓ Code linted and fixed$(NC)"

type-check: ## Run type checking with mypy
	@echo "$(BLUE)Type checking...$(NC)"
	mypy .

check: lint type-check ## Run all code checks
	@echo "$(GREEN)✓ All checks passed$(NC)"

##@ Health & Monitoring

health: ## Check API health
	@echo "$(BLUE)Checking API health...$(NC)"
	@sleep 2
	@curl -s http://localhost:8000/api/v1/health | python -m json.tool || echo "$(RED)✗ API not healthy$(NC)"

metrics: ## Show Prometheus metrics
	@echo "$(BLUE)Fetching metrics...$(NC)"
	@curl -s http://localhost:8000/api/v1/metrics

docs: ## Open API documentation
	@echo "$(BLUE)Opening API documentation...$(NC)"
	@open http://localhost:8000/api/docs || xdg-open http://localhost:8000/api/docs || echo "Please visit: http://localhost:8000/api/docs"

##@ Utilities

clean: ## Clean up cache and temporary files
	@echo "$(BLUE)Cleaning up...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	rm -rf htmlcov/ .coverage 2>/dev/null || true
	@echo "$(GREEN)✓ Cleaned up$(NC)"

clean-all: clean down ## Clean everything including Docker volumes
	@echo "$(BLUE)Removing Docker volumes...$(NC)"
	$(DOCKER_COMPOSE) down -v
	@echo "$(GREEN)✓ Everything cleaned$(NC)"

backup-db: ## Backup database
	@echo "$(BLUE)Backing up database...$(NC)"
	@mkdir -p backups
	$(DOCKER_COMPOSE) exec -T db pg_dump -U postgres parking_violations > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Database backed up$(NC)"

restore-db: ## Restore database from backup (usage: make restore-db FILE=backups/backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)✗ Please specify FILE=path/to/backup.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring database from $(FILE)...$(NC)"
	$(DOCKER_COMPOSE) exec -T db psql -U postgres parking_violations < $(FILE)
	@echo "$(GREEN)✓ Database restored$(NC)"

env-check: ## Check required environment variables
	@echo "$(BLUE)Checking environment variables...$(NC)"
	@if [ -f .env ]; then \
		if grep -q "OPENAI_API_KEY=your-openai-api-key-here" .env || grep -q "OPENAI_API_KEY=$$" .env; then \
			echo "$(RED)✗ OPENAI_API_KEY not configured$(NC)"; \
		else \
			echo "$(GREEN)✓ OPENAI_API_KEY configured$(NC)"; \
		fi; \
		if grep -q "SECRET_KEY=change-this" .env || grep -q "SECRET_KEY=your-secret" .env; then \
			echo "$(YELLOW)⚠ SECRET_KEY should be changed for production$(NC)"; \
		else \
			echo "$(GREEN)✓ SECRET_KEY configured$(NC)"; \
		fi; \
	else \
		echo "$(RED)✗ .env file not found$(NC)"; \
	fi

generate-secret: ## Generate a new SECRET_KEY
	@echo "$(BLUE)Generated SECRET_KEY:$(NC)"
	@$(PYTHON) -c 'import secrets; print(secrets.token_urlsafe(32))'

##@ Production

prod-build: ## Build production images
	@echo "$(BLUE)Building production images...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml build
	@echo "$(GREEN)✓ Production images built$(NC)"

prod-up: ## Start production services
	@echo "$(BLUE)Starting production services...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Production services started$(NC)"

prod-down: ## Stop production services
	@echo "$(BLUE)Stopping production services...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Production services stopped$(NC)"

##@ Quick Commands

quick-start: setup build up migrate ## Quick start: setup, build, start, migrate
	@echo "$(GREEN)✓ Application ready at http://localhost:8000$(NC)"
	@echo "$(GREEN)✓ API Docs: http://localhost:8000/api/docs$(NC)"
	@make health

rebuild: down build up ## Rebuild and restart services
	@echo "$(GREEN)✓ Services rebuilt and restarted$(NC)"

reset: clean-all quick-start ## Complete reset and fresh start
	@echo "$(GREEN)✓ Complete reset done$(NC)"

status: ps health ## Show status of all services
	@echo ""
	@echo "$(BLUE)Service URLs:$(NC)"
	@echo "  API:    http://localhost:8000"
	@echo "  Docs:   http://localhost:8000/api/docs"
	@echo "  Health: http://localhost:8000/api/v1/health"
