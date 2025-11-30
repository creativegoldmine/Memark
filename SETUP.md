# MeMark Backend Setup Guide

## Overview
MeMark is a Personal Inbound Knowledge Manager that allows users to text content to a shared number, with AI automatically organizing everything.

## Architecture
- **User Identification**: Phone number (from signup)
- **Shared Number**: All users text the same MeMark number
- **Premium Feature**: Dedicated personal number (future)
- **Backend**: Supabase + Edge Functions + Twilio

## Database Setup ✅
**Status**: Complete

All tables, RLS policies, and triggers are deployed:
- `users` - User accounts with phone numbers
- `items` - All content sent by users
- `collections` - Smart collections (auto-generated + user-created)
- `collection_items` - Many-to-many relationships
- `ai_event_log` - AI operation tracking

## Edge Functions ✅
**Status**: Deployed

Three functions are live:

### 1. `sms-webhook`
- Receives incoming SMS from Twilio
- Identifies user by phone number
- Creates item in database
- Triggers AI categorization

### 2. `categorize-item`
- Fetches link metadata (Open Graph, Twitter cards)
- Uses OpenAI GPT-4o-mini for smart categorization
- Auto-assigns items to matching collections
- Logs all AI operations

### 3. `import-bookmarks`
- Allows users to bulk import existing bookmarks
- Authenticated endpoint
- Returns success/failure counts

## Twilio Setup (Required)

### Step 1: Create Twilio Account
1. Go to [twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. Verify your email and phone number

### Step 2: Get a Phone Number
1. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
2. Select a number with SMS capabilities
3. Purchase the number (or use trial credits)
4. Copy the phone number (e.g., `+15551234567`)

### Step 3: Configure Webhook
1. Go to your phone number's settings
2. Under **Messaging Configuration**:
   - **A MESSAGE COMES IN**: Webhook
   - **URL**: `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/sms-webhook`
   - **HTTP Method**: POST
3. Save configuration

### Step 4: Update App with Real Number
Edit `/app/(tabs)/profile.tsx` line 87:
```typescript
<Text style={[styles.memarkNumber, { color: theme.primary }]}>+1 555 123-4567</Text>
```
Replace with your actual Twilio number.

### Step 5: Test SMS Flow
1. Text any link to your Twilio number
2. Check Twilio logs for webhook delivery
3. Check Supabase Edge Function logs
4. Verify item appears in database

## OpenAI Setup (Optional but Recommended)

### Add API Key to Supabase
1. Get OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. Go to Supabase Dashboard → **Project Settings** → **Edge Functions**
3. Add secret:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...`

**Note**: The system works without OpenAI, using fallback categorization. With OpenAI, you get:
- Smarter categorization
- Better titles and summaries
- More accurate tagging

## How Users Import Bookmarks

### JSON Format
Users can import bookmarks in this format:

```json
[
  {
    "url": "https://example.com/article",
    "title": "Great Article",
    "created_at": "2024-01-15T10:00:00Z"
  },
  {
    "url": "https://youtube.com/watch?v=abc123",
    "title": "Awesome Video"
  }
]
```

### Import Process
1. User goes to Profile tab
2. Taps **Import Bookmarks**
3. Pastes JSON array
4. System imports and categorizes each bookmark
5. Items appear in collections automatically

### Browser Bookmark Export
Users can export bookmarks from Chrome/Firefox/Safari, then convert HTML to JSON using a simple script or online tool.

## User Flow

### New User Signup
1. User creates account with phone number
2. 7 Smart Collections auto-created (Videos, Articles, Work, Personal, etc.)
3. User receives MeMark number to save

### Sending Content
1. User texts link/note to MeMark number: `+1 555 123-4567`
2. Twilio receives SMS → forwards to `sms-webhook`
3. Webhook identifies user by phone number
4. Creates item in database
5. Triggers AI categorization
6. Fetches link metadata (if URL)
7. Auto-assigns to matching collections
8. User sees organized content in app

### Shared Number System
- All users text the same number
- System identifies each user by their phone number
- Phone number linked during signup
- Secure and isolated per user

### Premium Upgrade (Future)
- Users can pay for dedicated personal number
- No sharing with other users
- Same backend, just different Twilio routing

## Testing Checklist

- [ ] User can sign up with phone number
- [ ] User sees 7 default Smart Collections
- [ ] User can see MeMark number in Profile
- [ ] SMS to Twilio number creates item in database
- [ ] AI categorization runs successfully
- [ ] Items auto-assigned to correct collections
- [ ] User can import bookmarks via JSON
- [ ] Home feed shows today's items
- [ ] Collections show item counts

## Environment Variables

### Frontend (.env)
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (Supabase Secrets - Auto-configured)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-... (optional)
```

## Monitoring & Debugging

### Check SMS Delivery
1. Twilio Console → **Monitor** → **Logs** → **Messaging**
2. Look for incoming messages
3. Check webhook responses (should be 200 OK)

### Check Edge Functions
1. Supabase Dashboard → **Edge Functions**
2. Click function name → **Logs**
3. Look for errors or successful executions

### Check Database
1. Supabase Dashboard → **Table Editor**
2. Check `items` table for new entries
3. Check `collection_items` for auto-assignments
4. Check `ai_event_log` for AI operations

## Cost Estimates

### Twilio
- Phone number: ~$1/month
- SMS incoming: $0.0075 per message
- 1000 messages/month = ~$8.50

### OpenAI
- GPT-4o-mini: $0.15 per 1M input tokens
- ~500 tokens per categorization
- 1000 messages/month = ~$0.08

### Supabase
- Free tier: 500K Edge Function invocations
- Pro tier: $25/month (if needed)

**Total for 1000 messages/month**: ~$10-35

## Production Recommendations

1. **Rate Limiting**: Add rate limits to prevent abuse
2. **Duplicate Detection**: Check for duplicate URLs before creating items
3. **Error Notifications**: Alert when webhook fails
4. **User Analytics**: Track categorization accuracy
5. **Backup Strategy**: Regular database backups
6. **Premium Billing**: Integrate Stripe for dedicated numbers

## Support & Issues

If something isn't working:
1. Check Twilio webhook logs
2. Check Supabase Edge Function logs
3. Verify phone number format in database
4. Test with Twilio SMS test console
5. Check RLS policies aren't blocking operations
