# Version Management and Packaging Guide

## Version Management

This project uses a single source of truth for versioning:

- **Frontend package.json**: The `version` field in `frontend/package.json` is the authoritative source for the project version.

When releasing a new version:

1. Update the version number in `frontend/package.json`
2. Use the clean packaging script to create a properly versioned archive

## Clean Packaging Process

The `clean_package.sh` script automates the creation of clean source archives:

1. Automatically reads the version from `frontend/package.json`
2. Includes only necessary source files
3. Excludes build artifacts, dependencies, and cache files
4. Verifies the presence of critical files before finalizing
5. Names the archive consistently with the current version

## Usage

```bash
# Run the packaging script
./clean_package.sh

# The script will:
# 1. Read the version from package.json
# 2. Create a clean archive with only source files
# 3. Verify the archive contents
# 4. Output the archive location and size
```

## What's Included/Excluded

**Included:**
- All source code files (backend/src, frontend/src)
- Configuration files (package.json, tsconfig.json, etc.)
- Docker configuration (Dockerfile, docker-compose.yml)
- Documentation (README.md)

**Excluded:**
- Build artifacts (frontend/dist)
- Dependencies (node_modules, venv)
- Cache files (__pycache__, .pytest_cache)
- Git directories (.git)
