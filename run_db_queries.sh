#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./run_db_queries.sh <DATABASE_URL>"
  echo "Example: ./run_db_queries.sh \"postgresql://postgres:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres\""
  exit 1
fi

DB_URL="$1"

echo "Capturing pre-state..."
psql "$DB_URL" -c 'SELECT COUNT(*) AS user_count, SUM("tokenVersion") AS sum_before FROM "User";'

echo "Running invalidation..."
psql "$DB_URL" -c 'UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1;'

echo "Verifying post-state..."
psql "$DB_URL" -c 'SELECT COUNT(*) AS user_count, SUM("tokenVersion") AS sum_after FROM "User";'

echo "Done."
