#!/bin/bash

# Step 1: Execute curl command and capture response
RESPONSE=$(curl -s -k -X POST "https://demo-stable.ofbiz.apache.org/rest/auth/token" \
  -H "accept: application/json" \
  -H "Authorization: Basic YWRtaW46b2ZiaXo")

# Step 2: Extract access_token from JSON response
ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.data.access_token')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Failed to retrieve access_token"
  echo "Response was: $RESPONSE"
  exit 1
fi

echo "✅ Retrieved access_token: $ACCESS_TOKEN"

# Step 3: Update ./config/config.json with new token
CONFIG_FILE="./config/config.json"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Config file not found: $CONFIG_FILE"
  exit 1
fi

# Update BACKEND_AUTH_TOKEN field
TMP_FILE=$(mktemp)
jq --arg token "$ACCESS_TOKEN" '.BACKEND_AUTH_TOKEN = $token' "$CONFIG_FILE" > "$TMP_FILE" \
  && mv "$TMP_FILE" "$CONFIG_FILE"

echo "✅ Updated $CONFIG_FILE with new BACKEND_AUTH_TOKEN"
