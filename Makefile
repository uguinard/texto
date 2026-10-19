# Makefile for unified development workflow
# Runs FastAPI backend (port 8000) and SolidJS frontend (port 5173) concurrently

.PHONY: dev backend frontend install install-backend install-frontend

# Default target - runs both servers concurrently
dev:
	@echo "Starting unified development environment..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@echo "Press Ctrl+C to stop both servers"
	@trap 'kill %1 %2' INT; \
	cd backend && uvicorn app.main:app --reload --port 8000 & \
	cd frontend && npm run dev & \
	wait

# Install all dependencies
install: install-backend install-frontend

install-backend:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Run only backend
backend:
	cd backend && uvicorn app.main:app --reload --port 8000

# Run only frontend
frontend:
	cd frontend && npm run dev