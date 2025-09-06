#!/bin/bash
set -e

PR_NUMBER=$(jq -r '.pull_request.number' "$GITHUB_EVENT_PATH")
WORKER_NAME=$(echo "$INPUT_WORKER_NAME_PATTERN" | sed "s/{pr_number}/$PR_NUMBER/g")

echo "Processing worker: $WORKER_NAME"
echo "worker_name=$WORKER_NAME" >> $GITHUB_OUTPUT

# Check if worker exists
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $INPUT_CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$INPUT_CLOUDFLARE_ACCOUNT_ID/workers/services/$WORKER_NAME")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "Worker exists, deleting..."
  
  DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
    -H "Authorization: Bearer $INPUT_CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$INPUT_CLOUDFLARE_ACCOUNT_ID/workers/services/$WORKER_NAME")
  
  DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
  
  if [ "$DELETE_CODE" = "200" ]; then
    echo "✅ Worker deleted successfully"
    echo "deleted=true" >> $GITHUB_OUTPUT
  else
    echo "❌ Failed to delete worker"
    echo "deleted=false" >> $GITHUB_OUTPUT
  fi
else
  echo "ℹ️ Worker does not exist"
  echo "deleted=false" >> $GITHUB_OUTPUT
fi
