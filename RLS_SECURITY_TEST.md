# RLS Security Testing Guide

## Overview
This guide provides step-by-step instructions to verify that Row Level Security (RLS) is properly configured and users cannot access each other's data.

## Prerequisites
- Two test user accounts with different credentials
- Access to Supabase dashboard or SQL editor
- Access to the app (web or mobile)

---

## Test 1: User Isolation for Items

### Setup
1. Create two test accounts:
   - **User A**: `test-user-a@example.com` / Password: `testpass123`
   - **User B**: `test-user-b@example.com` / Password: `testpass123`

2. For each user, note their phone numbers during signup (required field)

### Test Steps

#### Part 1: Create Data as User A
1. Sign in as User A
2. Send an SMS to your MeMark number with a test link (e.g., "https://example.com/test-a")
3. Wait for the item to appear in the Home feed
4. Note the item ID (you can check in Supabase dashboard)
5. Verify the item appears in User A's feed
6. Sign out

#### Part 2: Verify Isolation as User B
1. Sign in as User B
2. Check the Home feed - User A's items should NOT appear
3. Try to navigate directly to User A's item (if you have a detail view)
4. Send a different link as User B (e.g., "https://example.com/test-b")
5. Verify only User B's items appear
6. Sign out

#### Part 3: SQL Verification (Optional - Admin Only)
Run these queries in Supabase SQL Editor:

```sql
-- Get User A's ID
SELECT id, email FROM auth.users WHERE email = 'test-user-a@example.com';

-- Get User B's ID
SELECT id, email FROM auth.users WHERE email = 'test-user-b@example.com';

-- Check items for User A
SELECT id, title, user_id FROM items WHERE user_id = '<USER_A_ID>';

-- Check items for User B
SELECT id, title, user_id FROM items WHERE user_id = '<USER_B_ID>';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'items';
-- rowsecurity should be TRUE

-- View RLS policies on items table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'items';
```

### Expected Results
- ✅ User A sees only their own items
- ✅ User B sees only their own items
- ✅ No cross-user data visibility
- ✅ API calls for other users' items return empty or unauthorized

---

## Test 2: Collection Isolation

### Test Steps
1. Sign in as User A
2. Navigate to Collections tab
3. Create a custom collection (e.g., "My Private Collection")
4. Add items to this collection
5. Note the collection ID
6. Sign out

7. Sign in as User B
8. Navigate to Collections tab
9. Verify User A's custom collection does NOT appear
10. User B should only see their own default + custom collections

### Expected Results
- ✅ User A's collections are invisible to User B
- ✅ User B's collections are invisible to User A
- ✅ Each user can only manage their own collections

---

## Test 3: Folder/Tag Isolation

### Test Steps
1. Sign in as User A
2. Create a custom folder or tag
3. Assign items to it
4. Sign out

5. Sign in as User B
6. Check Browse/Search screens
7. Verify User A's folders/tags don't appear

### Expected Results
- ✅ Folders are user-specific
- ✅ Tags are user-specific (or properly isolated)
- ✅ No data leakage through search/browse

---

## Test 4: Direct API Manipulation (Advanced)

If you want to test RLS at the API level, use browser DevTools:

```javascript
// In browser console while signed in as User B
const { data, error } = await supabase
  .from('items')
  .select('*')
  .eq('user_id', '<USER_A_ID>'); // Try to query User A's data

console.log('Data:', data); // Should be empty []
console.log('Error:', error); // Should be null (RLS blocks it silently)
```

### Expected Results
- ✅ Query returns empty array (not an error, just no data)
- ✅ Cannot insert data for other users
- ✅ Cannot update other users' data
- ✅ Cannot delete other users' data

---

## Test 5: Profile Data Isolation

### Test Steps
1. Sign in as User A
2. Navigate to Profile tab
3. Note your name, email, and phone number
4. Sign out

5. Sign in as User B
6. Navigate to Profile tab
7. Try to access `/profile?user_id=<USER_A_ID>` (if URL params are used)
8. Verify you cannot see User A's profile data

### Expected Results
- ✅ User B cannot view User A's profile
- ✅ User B cannot edit User A's profile
- ✅ Direct URL manipulation doesn't bypass RLS

---

## Common RLS Vulnerabilities to Check

### 1. Missing RLS Policies
❌ **Bad**: Table has RLS enabled but no policies
```sql
-- This would block ALL access, even legitimate
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
-- (No policies created)
```

✅ **Good**: Table has RLS + appropriate policies
```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### 2. Overly Permissive Policies
❌ **Bad**: Policy allows access to all data
```sql
CREATE POLICY "Allow all"
  ON items FOR SELECT
  USING (true); -- This bypasses RLS!
```

✅ **Good**: Policy restricts to user's own data
```sql
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);
```

### 3. Missing User ID Checks
❌ **Bad**: No user_id validation in INSERT
```sql
CREATE POLICY "Allow inserts"
  ON items FOR INSERT
  WITH CHECK (true); -- User can insert as ANY user!
```

✅ **Good**: Enforce user_id matches authenticated user
```sql
CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Automated Test Script (Optional)

You can run this test script in your app's test suite:

```typescript
import { supabase } from '@/lib/supabase';

describe('RLS Security Tests', () => {
  let userAId: string;
  let userBId: string;
  let userAItemId: string;

  beforeAll(async () => {
    // Create User A
    const { data: userA } = await supabase.auth.signUp({
      email: 'test-a@example.com',
      password: 'test123456',
    });
    userAId = userA.user!.id;

    // Create item as User A
    const { data: itemA } = await supabase
      .from('items')
      .insert({ user_id: userAId, title: 'User A Item', raw_content: 'Test' })
      .select()
      .single();
    userAItemId = itemA!.id;

    // Sign out
    await supabase.auth.signOut();

    // Create User B
    const { data: userB } = await supabase.auth.signUp({
      email: 'test-b@example.com',
      password: 'test123456',
    });
    userBId = userB.user!.id;
  });

  test('User B cannot see User A items', async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('id', userAItemId);

    expect(data).toEqual([]);
  });

  test('User B cannot update User A items', async () => {
    const { error } = await supabase
      .from('items')
      .update({ title: 'Hacked' })
      .eq('id', userAItemId);

    expect(error).toBeTruthy();
  });

  test('User B cannot delete User A items', async () => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', userAItemId);

    expect(error).toBeTruthy();
  });

  afterAll(async () => {
    // Cleanup test users (admin operation)
    // ...
  });
});
```

---

## Conclusion

If all tests pass, your RLS is properly configured and secure. Users are properly isolated and cannot access each other's data.

### Quick Checklist
- [ ] User A cannot see User B's items
- [ ] User B cannot see User A's items
- [ ] Collections are user-specific
- [ ] Folders/tags are isolated
- [ ] Profile data is private
- [ ] Direct API queries are blocked by RLS
- [ ] All tables have RLS enabled
- [ ] All tables have appropriate policies

### If Issues Are Found
1. Check that RLS is enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
2. Verify policies use `auth.uid() = user_id` pattern
3. Test policies with `USING` and `WITH CHECK` clauses
4. Check for policies that use `true` or overly permissive conditions
