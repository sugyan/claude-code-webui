# Claude Code Web UI - Development Tasks

.PHONY: format format-check lint typecheck test build dev clean

# Formatting
format: format-frontend format-backend
format-frontend:
	cd frontend && npm run format
format-backend:
	cd backend && deno task format && npm run format

# Format checking  
format-check: format-check-frontend format-check-backend
format-check-frontend:
	cd frontend && npm run format:check
format-check-backend:
	cd backend && deno task format:check && npm run format:check

# Linting
lint: lint-frontend lint-backend
lint-frontend:
	cd frontend && npm run lint
lint-backend:
	cd backend && deno task lint && npm run lint

# Type checking
typecheck: typecheck-frontend typecheck-backend
typecheck-frontend:
	cd frontend && npm run typecheck
typecheck-backend:
	cd backend && deno task check && npm run typecheck

# Testing
test: test-frontend test-backend
test-frontend:
	cd frontend && npm run test:run
test-backend:
	cd backend && npm run test

# Building
build: build-frontend copy-dist build-backend
build-frontend:
	cd frontend && npm run build
copy-dist:
	rm -rf backend/dist
	cp -r frontend/dist backend/dist
build-backend:
	cd backend && deno task build

# Development
dev-frontend:
	cd frontend && npm run dev
dev-backend:
	cd backend && deno task dev

# Quality checks (run before commit)
check: format-check lint typecheck test build-frontend

# Install dependencies
install:
	cd frontend && npm ci

# Format specific files (usage: make format-files FILES="file1 file2")
format-files:
	@for file in $(FILES); do \
		echo "Formatting $$file"; \
		cd $(PWD)/frontend && npx prettier --write "../$$file"; \
	done

# Clean
clean:
	cd frontend && rm -rf node_modules dist
	cd backend && rm -rf ../dist dist