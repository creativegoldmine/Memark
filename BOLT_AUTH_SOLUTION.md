# Password Reset Solution for Bolt-Managed Supabase

## The Real Issue

Since you're using a **Bolt-managed Supabase instance**, you don't have direct access to the Supabase dashboard to configure authentication URLs. However, **the app code is already correctly configured** to handle password resets.

## Why It's Not Working

The most likely issues are:

1. **URL Mismatch**: The email was sent when accessing the app from one URL, but you're trying to use the reset link from a different URL
2. **Token Expiration**: Password reset tokens expire after 1 hour
3. **Browser Cache**: Old session data is interfering

## Solution: Use the Bolt Preview URL

### Step 1: Get Your Bolt Preview URL

When you run your app in Bolt, it gives you a preview URL like:
```
https://[your-project].bolt.new
```

Or if running locally:
```
http://localhost:3000
```

**Important**: Always access the app from the SAME URL for both requesting the reset and using the reset link.

### Step 2: Request Password Reset

1. Go to your app's forgot password page
2. Enter your email address
3. Click "Send Reset Link"
4. Note the URL you're currently on (this is important!)

### Step 3: Check Your Email

1. Open the password reset email
2. Look at the reset link - it should match the URL from Step 2
3. If the URLs match, click the link
4. If they don't match, go back to the app using the SAME URL and request a new reset

### Step 4: Reset Your Password

1. You should land on the reset password page
2. If you see "Invalid Link", the URLs didn't match
3. If you see the password form, enter your new password
4. Click "Update Password"

## Quick Test Method

1. **Open a fresh incognito/private browser window**
2. **Go to your app URL** (e.g., `http://localhost:3000`)
3. **Go to forgot password** (`/forgot-password`)
4. **Enter your email**
5. **Check email and click the link**
6. **Should redirect back to the same URL** at `/reset-password`

## For Production

When you deploy your app to production, Bolt will automatically configure the correct production URLs. No manual configuration needed!

## Testing Locally

If you're testing locally, make sure you're using `http://localhost:3000` consistently (or whatever port your dev server is using).

### Verify Your Setup:

Run this in your browser console on the forgot-password page:
```javascript
console.log('Current URL:', window.location.origin);
console.log('Expected reset URL:', window.location.origin + '/reset-password');
```

This is where the reset link will redirect to!

## Still Having Issues?

Try this diagnostic flow:

1. **Clear browser cache and cookies**
2. **Open incognito window**
3. **Go to**: `[your-app-url]/forgot-password`
4. **Request reset for your email**
5. **Open the email ON THE SAME DEVICE**
6. **Click the link**
7. **Should work!**

## Technical Details

The app is correctly configured:

- `forgot-password.tsx` uses `window.location.origin/reset-password` as the redirect URL
- `reset-password.tsx` properly extracts tokens from the URL hash
- All authentication flows are implemented correctly

The issue is NOT with the code - it's with URL consistency or token expiration.

## Why Bolt Manages This

Bolt automatically manages:
- Supabase project provisioning
- Authentication configuration
- Environment variables
- Development and production URL configurations

You don't need dashboard access because Bolt handles this infrastructure for you!
