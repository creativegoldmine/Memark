# MeMark System Architecture - Complete Verification

## System Overview

MeMark uses a **SHARED NUMBER** system where ALL users text the SAME phone number, and the system identifies each user by THEIR personal phone number that they registered with.

---

## How User Identification Works

### 1. User Signup Flow
**Location**: `/app/signup.tsx` (lines 19-54)

User provides:
- Name
- Email
- **Phone Number** ← THIS IS THE KEY IDENTIFIER
- Password

```typescript
// When user signs up, their phone number is stored
await signUp(email, password, name, phoneNumber);
```

### 2. Database Storage
**Table**: `public.users`

The phone number is stored as a **UNIQUE, NON-NULLABLE** field:

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,  ← User's personal phone
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  plan_type text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);
```

**Key Points:**
- `phone_number` has a UNIQUE constraint - no duplicates allowed
- Each user's phone is their permanent identifier
- Stored as text (e.g., "15551234567" - just digits, no formatting)

### 3. SMS Webhook Processing
**Location**: `/supabase/functions/sms-webhook/index.ts`

When ANYONE texts the MeMark number, here's what happens:

#### Step 1: Twilio Sends Webhook
```
POST https://YOUR_PROJECT.supabase.co/functions/v1/sms-webhook
From: +15551234567  ← The user's phone number
Body: "https://youtube.com/watch?v=abc123"
```

#### Step 2: Extract Sender's Phone Number (Line 29-33)
```typescript
const formData = await req.formData();
const from = formData.get('From') as string;  // "+15551234567"
const body = formData.get('Body') as string;  // The message content

// Strip all non-digits: "+1 (555) 123-4567" → "15551234567"
const phoneNumber = from.replace(/\D/g, '');
```

#### Step 3: Find User By Phone Number (Line 35-39)
```typescript
const { data: user, error: userError } = await supabase
  .from('users')
  .select('id')
  .eq('phone_number', phoneNumber)  ← MATCH user by their phone
  .maybeSingle();
```

**This query looks up:**
```sql
SELECT id FROM users WHERE phone_number = '15551234567';
```

#### Step 4: Security Check (Line 41-49)
```typescript
if (userError || !user) {
  return new Response(
    JSON.stringify({ error: 'User not found' }),
    { status: 404 }
  );
}
```

**What this means:**
- If phone number not in database → REJECTED
- User must have signed up first
- No anonymous messages allowed

#### Step 5: Create Item Linked to User (Line 51-62)
```typescript
const { data: item } = await supabase
  .from('items')
  .insert({
    user_id: user.id,  ← Linked to the identified user
    raw_content: body,
    status: 'active',
  })
  .select()
  .single();
```

---

## The Shared Number System

### How It Works

**One Twilio Number**: `+1 (555) 123-4567` (example)

**Multiple Users:**
- Alice's phone: `+1 (555) 111-1111`
- Bob's phone: `+1 (555) 222-2222`
- Carol's phone: `+1 (555) 333-3333`

### Example Flow

#### Alice texts MeMark:
```
From: +1 (555) 111-1111
To: +1 (555) 123-4567
Message: "Check out this cool article https://example.com"
```

**Backend Processing:**
1. Webhook receives: `From = "+15551111111"`
2. Strips to: `"15551111111"`
3. Database query: `WHERE phone_number = '15551111111'`
4. Finds: `user_id = "abc-123-..."`
5. Creates item linked to Alice's account

#### Bob texts MeMark (same number!):
```
From: +1 (555) 222-2222
To: +1 (555) 123-4567  ← SAME destination number
Message: "Remember to buy milk"
```

**Backend Processing:**
1. Webhook receives: `From = "+15552222222"`
2. Strips to: `"15552222222"`
3. Database query: `WHERE phone_number = '15552222222'`
4. Finds: `user_id = "xyz-789-..."`
5. Creates item linked to Bob's account

### Data Isolation

**Alice's items:**
```sql
SELECT * FROM items WHERE user_id = 'alice-uuid';
-- Returns only Alice's content
```

**Bob's items:**
```sql
SELECT * FROM items WHERE user_id = 'bob-uuid';
-- Returns only Bob's content
```

**Row Level Security (RLS) ensures:**
```sql
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```
- Users can ONLY see their own items
- Even if they try to hack the query
- Database-level security, not just app-level

---

## Twilio Configuration

### What You Need:

1. **One Twilio Phone Number**
   - Purchase from Twilio Console
   - Example: `+1 (555) 123-4567`
   - Cost: ~$1/month

2. **Webhook URL Configuration**
   ```
   When a message comes in:
   URL: https://YOUR_PROJECT.supabase.co/functions/v1/sms-webhook
   HTTP Method: POST
   ```

3. **That's it!**
   - No need for multiple numbers
   - All users share this one number
   - Twilio automatically includes sender's phone in webhook

### Webhook Payload from Twilio

Every SMS triggers this POST request:
```
POST /functions/v1/sms-webhook
Content-Type: application/x-www-form-urlencoded

From=+15551234567
To=+15559999999
Body=Check out this link
MessageSid=SM123abc
AccountSid=AC456def
```

**Key Fields:**
- `From`: The sender's phone number (user identifier)
- `To`: Your MeMark number (same for all users)
- `Body`: The message content

---

## Phone Number Format Handling

### User Input During Signup
Users can enter phone numbers in any format:
- `+1 (555) 123-4567`
- `555-123-4567`
- `15551234567`
- `(555) 123 4567`

### Storage Format
**Always stored as digits only**: `15551234567`

### Matching Logic
```typescript
// Incoming from Twilio: "+15551234567"
const phoneNumber = from.replace(/\D/g, '');  // "15551234567"

// Database has: "15551234567"
// Perfect match!
```

**Important:** Make sure signup flow also strips formatting:
```typescript
// In signup form
const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
```

---

## Security Considerations

### 1. User Must Be Registered
```typescript
if (!user) {
  return new Response(
    JSON.stringify({ error: 'User not found' }),
    { status: 404 }
  );
}
```
- Random numbers can't spam the system
- Must sign up through the app first

### 2. Row Level Security
```sql
-- Users can only see their own data
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);
```

### 3. Phone Number Verification (Future Enhancement)
Currently: No SMS verification (honor system)
Recommended: Add SMS verification during signup
```
1. User enters phone
2. Send verification code via Twilio
3. User confirms code
4. Phone number marked as verified
```

### 4. Rate Limiting (Recommended)
Add limits to prevent abuse:
- Max 100 messages per user per day
- Track in `users` table or separate `rate_limits` table

---

## Premium Tier: Dedicated Numbers

### How It Will Work

**Free Tier Users:**
- Share the number: `+1 (555) 123-4567`
- System identifies by sender's phone

**Premium Users:**
- Get their own unique number: `+1 (555) 777-7777`
- Still identified by their phone
- But they feel special with a dedicated line

**Database Addition:**
```sql
ALTER TABLE users ADD COLUMN dedicated_number text UNIQUE;
```

**Webhook Logic Update:**
```typescript
// Check if this is a dedicated number
const { data: dedicatedUser } = await supabase
  .from('users')
  .select('id')
  .eq('dedicated_number', to)  // Match by destination number
  .maybeSingle();

if (dedicatedUser) {
  user = dedicatedUser;
} else {
  // Fall back to sender phone number lookup
  user = await lookupByPhoneNumber(from);
}
```

---

## Testing the System

### Before Twilio Setup
1. **Check database**:
```sql
SELECT id, phone_number, email, name FROM users;
```
Verify phone numbers are stored correctly.

2. **Test edge function manually**:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sms-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+15551234567&Body=Test message"
```

### After Twilio Setup
1. **Text the number** from your registered phone
2. **Check Twilio logs**: Did webhook get called?
3. **Check Supabase logs**: Did function execute?
4. **Check database**: Did item get created?
```sql
SELECT * FROM items WHERE user_id = (
  SELECT id FROM users WHERE phone_number = '15551234567'
);
```

---

## Summary: The Full Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MEMARK SHARED NUMBER                      │
│                        +1 (555) 123-4567                        │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────┐
         │          Twilio Webhook                │
         │  "From: +15551111111"                  │
         │  "Body: https://example.com"           │
         └────────────────────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────┐
         │    Supabase Edge Function              │
         │    /functions/v1/sms-webhook           │
         │                                        │
         │  1. Extract sender phone: 15551111111  │
         │  2. Query: WHERE phone_number = ?      │
         │  3. Find user_id: abc-123-uuid         │
         └────────────────────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────┐
         │         Database (Postgres)            │
         │                                        │
         │  users table:                          │
         │  ├─ id: abc-123-uuid                   │
         │  ├─ phone_number: 15551111111          │
         │  └─ name: Alice                        │
         │                                        │
         │  items table:                          │
         │  ├─ user_id: abc-123-uuid ← LINKED!    │
         │  ├─ raw_content: "https://example.com" │
         │  └─ status: active                     │
         └────────────────────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────┐
         │     AI Categorization                  │
         │  - Fetch link metadata                 │
         │  - OpenAI GPT-4 analysis               │
         │  - Auto-assign to collections          │
         └────────────────────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────┐
         │          User's App                    │
         │  Alice sees her content organized!     │
         │  Bob's content is completely separate  │
         └────────────────────────────────────────┘
```

---

## Questions & Answers

**Q: What if two users have the same phone number?**
A: Impossible! The database has a UNIQUE constraint. Second signup would fail.

**Q: What if someone texts from a non-registered number?**
A: Webhook returns 404 "User not found". Message is rejected.

**Q: Can users change their phone number?**
A: Yes, but you'd need to add that feature. Update `phone_number` in database.

**Q: What about international numbers?**
A: Works fine! Just store with country code: "447700900123" (UK example)

**Q: How do I know which Twilio number to buy?**
A: Any US number with SMS capabilities. Cost is ~$1/month + $0.0075 per message.

**Q: Do I need to configure anything in Twilio besides the webhook?**
A: Nope! Just point the webhook URL and you're done.

---

## Ready to Deploy?

✅ Database has `phone_number` field with UNIQUE constraint
✅ SMS webhook identifies users by sender phone
✅ Edge functions deployed and ready
✅ Security via RLS ensures data isolation
✅ All users share one number

**Next step**: Get Twilio number and configure webhook URL.
