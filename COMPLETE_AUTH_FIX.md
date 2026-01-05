# Complete Authentication Fix Guide

## The Root Issue

Your password reset isn't working because Supabase requires explicit configuration of allowed redirect URLs. Since you're developing locally on `localhost:3000`, this URL must be added to your Supabase project's allowed URLs list.

## Quick Fix (5 minutes)

### Step 1: Configure Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/ckhzhabcvxyawhjcjsfu

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **URL Configuration**

3. **Set Site URL**
   ```
   http://localhost:3000
   ```

4. **Add Redirect URLs** (Add each one separately)
   ```
   http://localhost:3000/**
   http://localhost:3000/reset-password
   https://ckhzhabcvxyawhjcjsfu.supabase.co/**
   ```

5. **Save Changes**

### Step 2: Verify Email Template

1. **In Supabase Dashboard**, go to:
   - **Authentication** → **Email Templates** → **Reset Password**

2. **Ensure the template contains:**
   ```html
   <a href="{{ .SiteURL }}/reset-password">Reset Password</a>
   ```

3. **The template should redirect to:** `{{ .SiteURL }}/reset-password`
   - This will automatically use your configured Site URL

### Step 3: Test the Flow

1. **Open the test page:**
   ```bash
   # From your project directory, open in browser:
   # file:///path/to/project/test-password-reset.html
   ```
   Or just open `test-password-reset.html` in your browser

2. **Send a test reset email:**
   - Enter your email address
   - Click "Send Reset Email"
   - Check your inbox

3. **Click the reset link in the email**
   - It should redirect to `http://localhost:3000/reset-password`
   - You should see the password reset form (not "Invalid Link")

4. **Enter your new password**
   - Type your new password twice
   - Click "Update Password"
   - You should be redirected to login

## Why This Happens

Supabase uses a security feature that only allows redirects to pre-approved URLs. This prevents attackers from redirecting password reset links to malicious sites.

**Default behavior:**
- Supabase defaults to using your production URL
- Local development URLs are NOT automatically included
- You must explicitly add `localhost` URLs for development

## For Production Deployment

When you deploy your app, you'll need to:

1. **Update Site URL** to your production domain:
   ```
   https://yourdomain.com
   ```

2. **Add production URLs to Redirect URLs:**
   ```
   https://yourdomain.com/**
   https://yourdomain.com/reset-password
   ```

3. **Keep localhost URLs** if you want to continue local development:
   ```
   http://localhost:3000/**
   https://yourdomain.com/**
   ```

## Testing Checklist

- [ ] Site URL set to `http://localhost:3000`
- [ ] Redirect URLs include `http://localhost:3000/**`
- [ ] Email template uses `{{ .SiteURL }}/reset-password`
- [ ] Sent test reset email
- [ ] Clicked link in email
- [ ] Saw password reset form (not "Invalid Link" error)
- [ ] Successfully reset password
- [ ] Logged in with new password

## Common Errors and Solutions

### "Invalid Link" or "Link Expired"
**Cause:** The redirect URL is not in the allowed list
**Fix:** Add `http://localhost:3000/**` to Redirect URLs in Supabase dashboard

### Email redirects to wrong URL
**Cause:** Site URL is not set correctly
**Fix:** Set Site URL to `http://localhost:3000` in Supabase dashboard

### Token not found in URL
**Cause:** App code not extracting tokens correctly
**Fix:** Already fixed in `app/reset-password.tsx` - code now extracts tokens from URL hash

### Can't access Supabase dashboard
**Cause:** Need to be logged in
**Fix:** Log in at https://supabase.com with your account

## Need Help?

If you're still having issues:
1. Check the browser console for errors
2. Verify the URL in the email matches your Site URL
3. Make sure you're running the app on `localhost:3000`
4. Try the test page to isolate the issue
