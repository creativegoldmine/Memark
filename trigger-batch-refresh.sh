#!/bin/bash

# Trigger batch refresh for all items
# This will update all existing links with the new rich metadata

SUPABASE_URL="https://ckhzhabcvxyawhjcjsfu.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraHpoYWJjdnh5YXdoamNqc2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NDYzNTcsImV4cCI6MjA3OTQyMjM1N30.iHMU4n930fyTa4714cjEmuelKU4X9NDCI9O-VJw12ts"

echo "🔄 Starting batch refresh of all items..."
echo "This will update all existing links with rich social metadata."
echo ""

# You'll need to provide your auth token
echo "Please provide your auth token (from your logged-in session):"
read -r AUTH_TOKEN

curl -X POST \
  "${SUPABASE_URL}/functions/v1/batch-refresh-previews" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 1000,
    "onlyStale": false
  }' | jq '.'

echo ""
echo "✅ Batch refresh complete!"
