# Google OAuth 2.0 Setup Guide for TaskFlow Pro

## Required Scopes
Your app needs access to:
- **Google Calendar** - To create/update/delete calendar events
- **Gmail Send** - To send email notifications
- **User Profile** - Basic user information

## Step-by-Step Setup Instructions

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Create a New Project (or select existing)
- Click "Select a project" → "New Project"
- Name: `TaskFlow Pro`
- Click "Create"

### 3. Enable Required APIs
Navigate to "APIs & Services" → "Library"

Enable these APIs:
- ✅ **Google Calendar API**
- ✅ **Gmail API**
- ✅ **Google+ API** (for profile info)

### 4. Configure OAuth Consent Screen
Go to "APIs & Services" → "OAuth consent screen"

- **User Type**: External
- Click "Create"

Fill in the required information:
- **App name**: TaskFlow Pro
- **User support email**: [Your email]
- **Developer contact**: [Your email]

**Scopes**: Click "Add or Remove Scopes" and add:
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/gmail.send
```

**Test Users**: Add your email address (required for testing)

### 5. Create OAuth 2.0 Credentials
Go to "APIs & Services" → "Credentials"

- Click "Create Credentials" → "OAuth client ID"
- **Application type**: Web application
- **Name**: TaskFlow Pro Web Client

**Authorized JavaScript origins**:
```
http://localhost:3000
https://your-production-domain.com
```

**Authorized redirect URIs**:
```
http://localhost:3000/api/auth/callback/google
https://your-production-domain.com/api/auth/callback/google
```

Click "Create"

### 6. Copy Your Credentials
You'll see a popup with:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxx`

**⚠️ Keep these secure!**

### 7. Update Your .env File
```env
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-secret-here
```

### 8. Restart Your Dev Server
After updating `.env`, reload the environment variables:
```bash
# The system will automatically reload when you save .env
```

---

## Testing the Integration

1. **Sign in with Google** - Click the button on your homepage
2. **Grant Permissions** - Allow access to Calendar and Gmail
3. **Create a Task** - It should sync to your Google Calendar
4. **Check Email** - Overdue task reminders will be sent via Gmail

---

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Make sure you added your email to "Test Users" in OAuth consent screen

### "redirect_uri_mismatch"
- Verify the redirect URI exactly matches in Google Console

### "invalid_client"
- Double-check your Client ID and Secret in `.env`

### "insufficient_scope"
- Make sure all required scopes are added in OAuth consent screen

---

## Production Deployment

Before going to production:
1. Complete OAuth app verification with Google
2. Update authorized origins and redirect URIs with your production domain
3. Remove "Test Users" restriction
4. Consider OAuth consent screen branding (logo, privacy policy, terms)

---

## Environment Variables Summary

After setup, your `.env` should have:

```env
# Turso Database (from Step 1)
TURSO_CONNECTION_URL=libsql://[your-db-name]-[username].turso.io
TURSO_AUTH_TOKEN=[your-token]

# Better Auth
BETTER_AUTH_SECRET=Vh1IU4AKq0UegQgVarTXhfejf+0R9OmOkpTovG7G1Yo=

# Google OAuth (REQUIRED - replace test values)
GOOGLE_CLIENT_ID=[your-client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[your-secret]

# Twilio (Optional - for WhatsApp)
TWILIO_ACCOUNT_SID=[optional]
TWILIO_AUTH_TOKEN=[optional]
TWILIO_PHONE_NUMBER=[optional]

# Cron Secret (for scheduled tasks)
CRON_SECRET=my-strong-secret-key
```
