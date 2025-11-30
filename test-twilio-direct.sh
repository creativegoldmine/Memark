#!/bin/bash
# Direct Twilio API test - checks if credentials work and what messages exist
# Provide credentials as: TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx bash test-twilio-direct.sh

if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
  echo "ERROR: Twilio credentials not set"
  echo "Run: TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx bash test-twilio-direct.sh"
  exit 1
fi

echo "Testing Twilio API with Account: $TWILIO_ACCOUNT_SID"
echo ""
echo "Step 1: Getting phone numbers..."
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers.json" \
  2>/dev/null | head -80

echo ""
echo ""
echo "Step 2: Getting recent messages..."
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json?PageSize=5" \
  2>/dev/null | head -100
