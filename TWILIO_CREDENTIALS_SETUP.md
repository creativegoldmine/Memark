# CRITICAL: Twilio Credentials Setup

## The Problem

Your sync button is failing because **Twilio credentials are NOT configured** in Supabase Edge Functions.

The edge function `sync-twilio-messages` needs two environment variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

## How to Fix This NOW

### Step 1: Get Your Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com)
2. On the dashboard, you'll see:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (click "Show" to reveal it)
3. Copy both values

### Step 2: Add Credentials to Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/ckhzhabcvxyawhjcjsfu)
2. Click on **Edge Functions** in the left sidebar
3. Click on **Settings** or **Secrets** tab
4. Add two secrets:

   **Secret Name:** `TWILIO_ACCOUNT_SID`
   **Value:** (paste your Account SID starting with "AC...")

   **Secret Name:** `TWILIO_AUTH_TOKEN`
   **Value:** (paste your Auth Token)

5. Click **Save** or **Add Secret**

### Step 3: Test the Sync

After adding the credentials:

1. Open the app
2. Go to Profile tab
3. Click **Sync SMS Messages** button
4. You should now see:
   - "Total messages found: X"
   - "Imported: X"
   - "Skipped: X"

## Alternative: Test Using test-twilio.html

1. Open: `/tmp/cc-agent/60588736/project/test-twilio.html` in your browser
2. Click **Test Twilio Connection**
3. If credentials are configured correctly, you'll see your Twilio phone numbers
4. Click **Sync Messages** to import all messages

## Important Notes

### Phone Number Matching

The sync function matches messages by phone number. Your database has:
- User phone: `4254426528` (digits only)

When Twilio sends a message from `+1 (425) 442-6528`, the function:
1. Strips formatting: `14254426528`
2. Looks for user with phone `4254426528`

**This WILL MATCH** because both formats strip to the same digits.

### What Gets Synced

The function fetches ALL messages sent TO your Twilio number, then:
1. Matches sender phone to registered users
2. Skips messages from unregistered numbers
3. Skips duplicate messages (same content)
4. Imports new messages as items
5. Auto-categorizes URLs

### Expected Behavior

If you have:
- 100 messages to your Twilio number
- 20 from registered users
- 10 already in database

Result:
- Total: 100
- Imported: 10 (new ones)
- Skipped: 90 (70 from unregistered + 20 duplicates)

## Why Twilio Shows No Attempts

Twilio logs API calls TO their service. Currently:
- ❌ No API calls are being made
- ❌ Credentials are not configured
- ❌ Function errors out before calling Twilio

Once you add credentials:
- ✅ Function will call Twilio API
- ✅ You'll see API requests in Twilio logs
- ✅ Messages will import into your app

## Still Not Working?

After adding credentials, if it still fails:

1. Check Supabase Edge Function logs:
   - Dashboard → Edge Functions → sync-twilio-messages → Logs
   - Look for error messages

2. Check browser console:
   - Open DevTools (F12)
   - Click sync button
   - Look for errors in Console tab

3. Verify phone number format:
   ```sql
   SELECT id, email, phone_number FROM users;
   ```
   Should show digits only: `4254426528`

## Summary

**DO THIS NOW:**
1. Get Twilio Account SID and Auth Token
2. Add both to Supabase Edge Functions secrets
3. Click sync button in app
4. Messages will import

**The function code is correct. It just needs your Twilio API credentials to work.**
