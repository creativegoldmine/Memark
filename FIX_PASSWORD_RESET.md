# Password Reset Fix - Required Configuration

## The Problem

The password reset emails are being sent with redirect URLs to `http://localhost:3000`, but Supabase needs to have this URL explicitly allowed in the authentication configuration.

## Solution

You need to configure the authentication redirect URLs in your Supabase project dashboard.

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `ckhzhabcvxyawhjcjsfu`

### Step 2: Configure Authentication URLs

1. Navigate to **Authentication** → **URL Configuration**
2. Set the following values:

**Site URL:**
```
http://localhost:3000
```

**Redirect URLs (add both):**
```
http://localhost:3000/**
http://localhost:3000/reset-password
https://ckhzhabcvxyawhjcjsfu.supabase.co/**
```

### Step 3: Email Template Configuration

1. Navigate to **Authentication** → **Email Templates**
2. Find the **Reset Password** template
3. Ensure the redirect URL in the template uses: `{{ .SiteURL }}/reset-password`

### Step 4: Test the Flow

1. Go to http://localhost:3000/forgot-password
2. Enter your email address
3. Check your email for the reset link
4. Click the link - it should redirect to http://localhost:3000/reset-password with the tokens in the URL
5. Enter your new password

## For Production Deployment

When you deploy your app to production, you'll need to:

1. Update the **Site URL** to your production domain
2. Add your production domain to the **Redirect URLs** list
3. Keep localhost URLs if you want to test in development

## Common Issues

- **"Invalid link"** error: The redirect URL is not in the allowed list
- **Tokens not in URL**: Check that the email template is using the correct redirect URL format
- **Session not established**: The token extraction code should handle this (already fixed in the app)
