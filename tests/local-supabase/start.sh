#!/usr/bin/env bash
# Sobe um Supabase local (Postgres, Auth, REST, Storage, Realtime) só para testes.
# Uso: bash tests/local-supabase/start.sh   |   parar: bash tests/local-supabase/stop.sh
set -euo pipefail
cd "$(dirname "$0")"
REG="${IMAGE_REGISTRY:-mirror.gcr.io}"
NET=hf-net
PASS=postgres
JWT_SECRET=$(node -e 'import("./keys.mjs").then(m=>console.log(m.JWT_SECRET))')
ANON_KEY=$(node keys.mjs anon)
SERVICE_KEY=$(node keys.mjs service)
ROOT_KEY=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')

docker network inspect $NET >/dev/null 2>&1 || docker network create $NET >/dev/null

if ! docker ps --format '{{.Names}}' | grep -q '^hf-db$'; then
  docker rm -f hf-db >/dev/null 2>&1 || true
  docker run -d --name hf-db --network $NET -p 54322:5432 \
    -e POSTGRES_PASSWORD=$PASS -e POSTGRES_HOST=/var/run/postgresql \
    -e JWT_SECRET="$JWT_SECRET" -e JWT_EXP=3600 \
    -v "$PWD/init-schema.sql:/tmp/init-schema.sql:ro" \
    --entrypoint sh "$REG/supabase/postgres:17.6.1.106" -c "
      cp /tmp/init-schema.sql /etc/postgresql.schema.sql && \
      echo $ROOT_KEY > /etc/postgresql-custom/pgsodium_root.key && \
      docker-entrypoint.sh postgres -D /etc/postgresql" >/dev/null
fi

echo -n "aguardando banco"
for i in $(seq 1 90); do
  if docker exec hf-db pg_isready -U postgres -h 127.0.0.1 -p 5432 >/dev/null 2>&1 \
     && docker exec -e PGPASSWORD=$PASS hf-db psql -U supabase_admin -h 127.0.0.1 -d postgres -tAc "select 1 from pg_roles where rolname='authenticator'" 2>/dev/null | grep -q 1; then
    echo " ok"; break
  fi
  echo -n "."; sleep 2
done
sleep 3

DB="postgresql://%s:$PASS@hf-db:5432/postgres"

docker rm -f hf-auth >/dev/null 2>&1 || true
docker run -d --name hf-auth --network $NET -p 54390:9999 \
  -e API_EXTERNAL_URL=http://localhost:54321/auth/v1 \
  -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 \
  -e GOTRUE_DB_DRIVER=postgres \
  -e GOTRUE_DB_DATABASE_URL="$(printf "$DB" supabase_auth_admin)" \
  -e GOTRUE_SITE_URL=http://localhost:3000 \
  -e GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**" \
  -e GOTRUE_DISABLE_SIGNUP=false \
  -e GOTRUE_JWT_ADMIN_ROLES=service_role -e GOTRUE_JWT_AUD=authenticated \
  -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_EXP=3600 \
  -e GOTRUE_JWT_SECRET="$JWT_SECRET" -e GOTRUE_JWT_ISSUER=http://localhost:54321/auth/v1 \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true \
  -e GOTRUE_EXTERNAL_PHONE_ENABLED=false -e GOTRUE_PASSWORD_MIN_LENGTH=8 \
  -e GOTRUE_RATE_LIMIT_EMAIL_SENT=360000 -e GOTRUE_RATE_LIMIT_OTP=100000 \
  -e GOTRUE_RATE_LIMIT_TOKEN_REFRESH=100000 -e GOTRUE_RATE_LIMIT_VERIFY=100000 \
  "$REG/supabase/gotrue:v2.188.1" >/dev/null

docker rm -f hf-rest >/dev/null 2>&1 || true
docker run -d --name hf-rest --network $NET -p 54391:3000 \
  -e PGRST_DB_URI="$(printf "$DB" authenticator)" \
  -e PGRST_DB_SCHEMAS=public,graphql_public -e PGRST_DB_EXTRA_SEARCH_PATH=public,extensions \
  -e PGRST_DB_MAX_ROWS=1000 -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="$JWT_SECRET" -e PGRST_ADMIN_SERVER_PORT=3001 \
  "$REG/postgrest/postgrest:v14.10" >/dev/null

mkdir -p "$PWD/../../.local-stack/storage"
docker rm -f hf-storage >/dev/null 2>&1 || true
docker run -d --name hf-storage --network $NET -p 54392:5000 \
  -e ANON_KEY="$ANON_KEY" -e SERVICE_KEY="$SERVICE_KEY" -e AUTH_JWT_SECRET="$JWT_SECRET" \
  -e DATABASE_URL="$(printf "$DB" supabase_storage_admin)" \
  -e FILE_SIZE_LIMIT=52428800 -e STORAGE_BACKEND=file -e FILE_STORAGE_BACKEND_PATH=/mnt \
  -e TENANT_ID=stub -e STORAGE_S3_REGION=local -e GLOBAL_S3_BUCKET=stub \
  -e ENABLE_IMAGE_TRANSFORMATION=false -e TUS_URL_PATH=/storage/v1/upload/resumable \
  -e S3_PROTOCOL_ENABLED=false \
  -v "$PWD/../../.local-stack/storage:/mnt" \
  "$REG/supabase/storage-api:v1.54.1" >/dev/null

docker rm -f hf-realtime >/dev/null 2>&1 || true
docker run -d --name hf-realtime --network $NET -p 54393:4000 \
  -e PORT=4000 -e DB_HOST=hf-db -e DB_PORT=5432 -e DB_USER=supabase_admin -e DB_PASSWORD=$PASS \
  -e DB_NAME=postgres -e "DB_AFTER_CONNECT_QUERY=SET search_path TO _realtime" \
  -e DB_ENC_KEY=supabaserealtime -e API_JWT_SECRET="$JWT_SECRET" -e METRICS_JWT_SECRET="$JWT_SECRET" \
  -e APP_NAME=realtime -e SECRET_KEY_BASE=EAx3IQ/wRG1v47ZD4NE4/9RzBI8Jmil3x0yhcW4V2NHBP6c2iPIzwjofi2Ep4HIG \
  -e ERL_AFLAGS="-proto_dist inet_tcp" -e DNS_NODES="''" -e RLIMIT_NOFILE= \
  -e SEED_SELF_HOST=true -e RUN_JANITOR=true \
  "$REG/supabase/realtime:v2.86.3" >/dev/null

echo "serviços iniciados"
echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
