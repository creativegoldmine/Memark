#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
PLATFORMS=""
ONLY_STALE="false"
LIMIT=1000
DRY_RUN="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --platforms=*)
      PLATFORMS="${1#*=}"
      shift
      ;;
    --only-stale)
      ONLY_STALE="true"
      shift
      ;;
    --limit=*)
      LIMIT="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./refresh-social-previews.sh [--platforms=instagram,facebook,youtube,tiktok,vimeo] [--only-stale] [--limit=1000] [--dry-run]"
      exit 1
      ;;
  esac
done

# Check required environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env file"
  exit 1
fi

# Convert platforms to JSON array
PLATFORMS_JSON="[]"
if [ -n "$PLATFORMS" ]; then
  IFS=',' read -ra PLATFORM_ARRAY <<< "$PLATFORMS"
  PLATFORMS_JSON="["
  for i in "${!PLATFORM_ARRAY[@]}"; do
    if [ $i -gt 0 ]; then
      PLATFORMS_JSON="${PLATFORMS_JSON},"
    fi
    PLATFORMS_JSON="${PLATFORMS_JSON}\"${PLATFORM_ARRAY[$i]}\""
  done
  PLATFORMS_JSON="${PLATFORMS_JSON}]"
fi

# Build request body
REQUEST_BODY="{\"limit\":${LIMIT},\"onlyStale\":${ONLY_STALE}"
if [ "$PLATFORMS_JSON" != "[]" ]; then
  REQUEST_BODY="${REQUEST_BODY},\"platforms\":${PLATFORMS_JSON}"
fi
REQUEST_BODY="${REQUEST_BODY}}"

echo "========================================="
echo "Social Preview Refresh Script"
echo "========================================="
echo "Platforms: ${PLATFORMS:-all}"
echo "Only stale: ${ONLY_STALE}"
echo "Limit: ${LIMIT}"
echo "Dry run: ${DRY_RUN}"
echo "========================================="

if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "DRY RUN MODE - Would send request:"
  echo "URL: ${VITE_SUPABASE_URL}/functions/v1/batch-refresh-previews"
  echo "Body: ${REQUEST_BODY}"
  echo ""
  echo "To actually run, remove the --dry-run flag"
  exit 0
fi

echo ""
echo "Starting refresh..."
echo ""

# Make the request
RESPONSE=$(curl -s -X POST \
  "${VITE_SUPABASE_URL}/functions/v1/batch-refresh-previews" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_BODY}")

# Check if response is valid JSON
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')

  if [ "$SUCCESS" = "true" ]; then
    PROCESSED=$(echo "$RESPONSE" | jq -r '.processed // 0')
    UPDATED=$(echo "$RESPONSE" | jq -r '.updated // 0')
    FAILED=$(echo "$RESPONSE" | jq -r '.failed // 0')
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message // ""')

    echo "✓ Success!"
    echo "  Processed: ${PROCESSED}"
    echo "  Updated: ${UPDATED}"
    echo "  Failed: ${FAILED}"
    echo ""
    echo "Message: ${MESSAGE}"

    ERRORS=$(echo "$RESPONSE" | jq -r '.errors // [] | length')
    if [ "$ERRORS" -gt 0 ]; then
      echo ""
      echo "Errors (showing first 10):"
      echo "$RESPONSE" | jq -r '.errors[] | "  - Item \(.itemId): \(.error)"'
    fi
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message // ""')
    echo "✗ Failed!"
    echo "  Error: ${ERROR}"
    if [ -n "$MESSAGE" ]; then
      echo "  Message: ${MESSAGE}"
    fi
  fi
else
  echo "✗ Invalid response from server:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "========================================="
echo "Refresh complete!"
echo "========================================="
