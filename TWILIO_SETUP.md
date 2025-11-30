# Twilio SMS Integration Setup Guide

## What You'll Need

You mentioned you already have a MeMark number for sharing. This guide will help you connect it to the app.

---

## Step 1: Find Your MeMark Twilio Number

If you already have a Twilio number:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Find your MeMark number (should look like: `+1 234 567 8900`)
4. Copy the full number including country code

---

## Step 2: Configure Twilio Webhook

1. In Twilio Console, click on your MeMark phone number
2. Scroll to **Messaging Configuration**
3. Under **A MESSAGE COMES IN**:
   - **Configure with**: Webhook
   - **URL**: `https://ckhzhabcvxyawhjcjsfu.supabase.co/functions/v1/sms-webhook`
   - **HTTP Method**: POST
   - **Fallback URL**: (leave blank or same URL)
4. Click **Save**

**Important**: The webhook URL is already deployed and ready! It uses your Supabase project URL.

---

## Step 3: Update App with Real Number

Edit `/app/(tabs)/profile.tsx` line 159:

**Current (placeholder):**
```typescript
<Text style={[styles.memarkNumber, { color: theme.primary }]}>+1 (555) 123-4567</Text>
```

**Replace with your actual Twilio number:**
```typescript
<Text style={[styles.memarkNumber, { color: theme.primary }]}>+1 (234) 567-8900</Text>
```

---

## Step 4: Test the Integration

### Test SMS Flow:

1. **Send a test SMS** from the phone number you registered with:
   ```
   To: [Your MeMark Number]
   Message: https://youtube.com/watch?v=test123
   ```

2. **Check Twilio Logs**:
   - Go to Twilio Console → **Monitor** → **Logs** → **SMS Messages**
   - Find your message
   - Check webhook delivery status (should be 200 OK)

3. **Check Supabase Logs**:
   - Go to Supabase Dashboard → **Edge Functions** → `sms-webhook`
   - Click **Logs** tab
   - Look for incoming request logs

4. **Check Database**:
   ```sql
   SELECT * FROM items
   WHERE user_id = (
     SELECT id FROM users
     WHERE phone_number = 'YOUR_PHONE_DIGITS_ONLY'
   )
   ORDER BY created_at DESC
   LIMIT 1;
   ```

5. **Check App**:
   - Open MeMark app
   - Go to Home tab
   - Should see the item you just texted!

---

## How It Works (Technical Flow)

### User sends SMS:
```
From: +1 234 567 8900 (user's phone)
To: +1 999 888 7777 (your MeMark number)
Body: "https://example.com/article"
```

### Twilio forwards to webhook:
```
POST https://ckhzhabcvxyawhjcjsfu.supabase.co/functions/v1/sms-webhook
Content-Type: application/x-www-form-urlencoded

From=+12345678900
To=+19998887777
Body=https://example.com/article
```

### Edge function processes:
1. Strips phone to digits: `12345678900`
2. Queries: `SELECT id FROM users WHERE phone_number = '12345678900'`
3. Creates item linked to that user
4. Triggers AI categorization
5. Returns 200 OK to Twilio

### Result:
- Item appears in user's feed
- Auto-categorized to correct collections
- Rich preview with Open Graph data
- AI summary generated

---

## Troubleshooting

### Issue: "User not found" error

**Cause**: The phone number texting MeMark is not registered in the app.

**Solution**:
1. Check user's phone number in database:
   ```sql
   SELECT id, name, phone_number FROM users;
   ```
2. Ensure phone is stored as digits only (no formatting)
3. User must sign up through the app first

---

### Issue: Webhook returns 404

**Cause**: Edge function not deployed or wrong URL.

**Solution**:
1. Verify function is deployed:
   - Supabase Dashboard → **Edge Functions**
   - Should see `sms-webhook` as ACTIVE
2. Double-check webhook URL in Twilio
3. Ensure URL uses YOUR Supabase project URL

---

### Issue: Items not categorizing

**Cause**: OpenAI API key not configured OR categorize-item function failing.

**Solution**:
1. Add OpenAI key (optional but recommended):
   - Supabase Dashboard → **Project Settings** → **Edge Functions**
   - Add secret: `OPENAI_API_KEY` = `sk-...`
2. Check categorize-item logs:
   - Supabase Dashboard → **Edge Functions** → `categorize-item` → **Logs**
3. System works without OpenAI (uses fallback categorization)

---

### Issue: Phone number format mismatch

**Cause**: Phone stored with formatting vs. Twilio sending without.

**Solution**:
Both webhook and signup strip formatting, so this should auto-resolve. But verify:

```sql
-- Check current format
SELECT phone_number FROM users;

-- Should be digits only: '12345678900'
-- NOT: '+1 (234) 567-8900'

-- Fix if needed:
UPDATE users
SET phone_number = regexp_replace(phone_number, '[^0-9]', '', 'g')
WHERE phone_number ~ '[^0-9]';
```

---

## Admin Panel Access

For uploading existing user data:

1. **Access Admin**:
   - Go to Profile tab
   - Tap "Profile" title 7 times quickly
   - Admin login screen appears

2. **Login**:
   - Email: `matthewjohnson22687@gmail.com`
   - Password: `Color1`

3. **Upload Data**:
   - Select user from list
   - Paste JSON array:
   ```json
   [
     {
       "url": "https://example.com/article",
       "title": "Great Article",
       "created_at": "2024-01-15T10:00:00Z"
     }
   ]
   ```
   - Click Upload

4. **Result**:
   - All items imported to selected user
   - AI categorizes each one
   - User sees everything organized in app

---

## Cost Estimates

### Twilio Costs:
- Phone number: ~$1/month
- Incoming SMS: $0.0075 per message
- **Example**: 500 messages/month = $4.75

### OpenAI Costs (optional):
- GPT-4o-mini: $0.15 per 1M input tokens
- ~500 tokens per categorization
- **Example**: 500 messages/month = $0.04

**Total for 500 messages/month**: ~$5-6

---

## Quick Reference

### Your Supabase Project:
- **URL**: `https://ckhzhabcvxyawhjcjsfu.supabase.co`
- **SMS Webhook**: `/functions/v1/sms-webhook`
- **Categorize**: `/functions/v1/categorize-item`
- **Admin Upload**: `/functions/v1/admin-upload`
- **Import**: `/functions/v1/import-bookmarks`

### Edge Functions Status:
✅ `sms-webhook` - SMS handler (DEPLOYED)
✅ `categorize-item` - AI categorization (DEPLOYED)
✅ `import-bookmarks` - User bulk import (DEPLOYED)
✅ `admin-upload` - Admin data upload (DEPLOYED)

### Admin Credentials:
- Email: `matthewjohnson22687@gmail.com`
- Password: `Color1`
- Access: Tap "Profile" title 7x

---

## Next Steps

1. ✅ Find your MeMark Twilio number
2. ✅ Configure webhook URL in Twilio
3. ✅ Update phone number in app code (line 159)
4. ✅ Send test SMS from registered phone
5. ✅ Verify item appears in app
6. ✅ Test admin panel for data migration
7. ✅ Upload existing user's bookmarks

**The system is ready!** Just need your Twilio number to complete the connection.
