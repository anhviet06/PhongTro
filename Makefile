.PHONY: install dev build build-win build-portable clean lint rebuild help

# Default target: display help
help:
	@echo "PhongTroApp Management Commands:"
	@echo "  make install        - Install npm dependencies"
	@echo "  make dev            - Run the Electron app in development mode"
	@echo "  make build          - Build the application (production)"
	@echo "  make build-win      - Build Windows installer (NSIS)"
	@echo "  make build-portable - Build portable Windows executable"
	@echo "  make rebuild        - Rebuild native modules (e.g., better-sqlite3) for Electron"
	@echo "  make lint           - Run ESLint to check for code issues"
	@echo "  make clean          - Remove build and release directories"

# Install project dependencies
install:
	npm install

# Run application in development mode
dev:
	npm run electron:dev

# Build the application
build:
	npm run build

# Build Windows installer
build-win:
	npm run build:win

# Build portable Windows executable
build-portable:
	npm run build:portable

# Rebuild native Node modules for Electron (crucial for better-sqlite3)
rebuild:
	npx electron-rebuild -f -w better-sqlite3

# Check for lint errors
lint:
	npm run lint

# Clean build and release artifacts
clean:
	@powershell -Command "Remove-Item -Recurse -Force dist, dist-electron, release -ErrorAction SilentlyContinue" && echo Cleaned build directories.
