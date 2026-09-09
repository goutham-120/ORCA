# ORCA
ORCA - Ocean Resource and Contextual Analysis

## Authentication database setup

Install backend dependencies with Python's package manager (not `npm`):

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Set `ORCA_DATABASE_URL` to a PostgreSQL connection URL to persist users in PostgreSQL (for example, `postgresql://user:password@host:5432/orca`). The authenticated user table is initialized automatically on API startup. PostgreSQL connections require `pip install -r backend/requirements-postgres.txt` in addition to the regular backend requirements. Set `ORCA_JWT_SECRET` to a strong deployment secret so issued authentication tokens remain valid across application restarts.

Without `ORCA_DATABASE_URL`, the backend uses its local SQLite fallback for development.
