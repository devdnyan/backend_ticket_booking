
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ticket_app_password="$TICKET_APP_PASSWORD" <<'SQL'
CREATE ROLE ticket_app
    WITH LOGIN PASSWORD :'ticket_app_password';
SQL
