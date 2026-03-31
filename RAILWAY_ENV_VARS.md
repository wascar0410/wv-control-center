# WV Control Center - Railway Environment Variables Reference

This document lists all environment variables needed for Railway deployment.

## Quick Reference Table

| Variable | Source | Required | Description |
|----------|--------|----------|-------------|
| `DATABASE_URL` | Railway PostgreSQL | ✅ Yes | PostgreSQL connection string (auto-provided) |
| `NODE_ENV` | Manual | ✅ Yes | Set to `production` |
| `PORT` | Manual | ✅ Yes | Set to `3000` |
| `VITE_APP_ID` | Manus Dashboard | ✅ Yes | OAuth application ID |
| `VITE_OAUTH_PORTAL_URL` | Your Domain | ✅ Yes | Frontend URL for OAuth redirects |
| `VITE_FRONTEND_FORGE_API_URL` | Manus | ✅ Yes | Manus API endpoint |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus Dashboard | ✅ Yes | Frontend API key |
| `BACKEND_PUBLIC_URL` | Your Domain | ✅ Yes | Backend public URL (for API calls) |
| `FRONTEND_PUBLIC_URL` | Your Domain | ✅ Yes | Frontend public URL (for redirects) |
| `OAUTH_SERVER_URL` | Manus | ✅ Yes | OAuth server URL |
| `JWT_SECRET` | Generate | ✅ Yes | Secret for JWT signing (min 32 chars) |
| `OWNER_NAME` | Manual | ✅ Yes | Company/owner name |
| `OWNER_OPEN_ID` | Manus Dashboard | ✅ Yes | Owner's Manus OpenID |
| `BUILT_IN_FORGE_API_URL` | Manus | ✅ Yes | Manus built-in API URL |
| `BUILT_IN_FORGE_API_KEY` | Manus Dashboard | ✅ Yes | Server-side Manus API key |
| `AWS_REGION` | Manual | ⚠️ If S3 | AWS region (e.g., `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS | ⚠️ If S3 | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS | ⚠️ If S3 | AWS secret key |
| `AWS_S3_BUCKET` | AWS | ⚠️ If S3 | S3 bucket name |
| `SMTP_HOST` | Email Provider | ⚠️ If Email | SMTP server hostname |
| `SMTP_PORT` | Email Provider | ⚠️ If Email | SMTP port (usually 587) |
| `SMTP_USER` | Email Provider | ⚠️ If Email | SMTP username/email |
| `SMTP_PASSWORD` | Email Provider | ⚠️ If Email | SMTP password/app password |
| `TWILIO_ACCOUNT_SID` | Twilio | ⚠️ If SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio | ⚠️ If SMS | Twilio auth token |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio | ⚠️ If SMS | Twilio messaging service ID |
| `PLAID_CLIENT_ID` | Plaid | ⚠️ If Banking | Plaid client ID |
| `PLAID_SECRET` | Plaid | ⚠️ If Banking | Plaid secret |
| `PLAID_ENV` | Manual | ⚠️ If Banking | `production` or `sandbox` |
| `GOOGLE_MAPS_API_KEY` | Google Cloud | ⚠️ If Maps | Google Maps API key |
| `ALLOWED_ORIGINS` | Manual | ⚠️ CORS | Comma-separated allowed origins |
| `CORS_CREDENTIALS` | Manual | ⚠️ CORS | `true` to allow credentials |
| `VITE_APP_TITLE` | Manual | ❌ Optional | Application title (default: "WV Control Center") |
| `VITE_APP_LOGO` | CDN | ❌ Optional | Logo URL |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics | ❌ Optional | Analytics website ID |
| `VITE_ANALYTICS_ENDPOINT` | Analytics | ❌ Optional | Analytics endpoint URL |

## Detailed Configuration

### 1. Database

**From Railway PostgreSQL Service:**

```
DATABASE_URL=postgresql://user:password@host:5432/database
```

Railway automatically provides this when you add PostgreSQL service.

### 2. Application Core

```
NODE_ENV=production
PORT=3000
```

Always use these values for Railway production.

### 3. Frontend Configuration

These are used by the React frontend:

```
VITE_APP_ID=<from Manus Dashboard>
VITE_OAUTH_PORTAL_URL=https://your-railway-domain.railway.app
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=<from Manus Dashboard>
```

### 4. Backend Configuration

These are used by the Express backend:

```
BACKEND_PUBLIC_URL=https://your-railway-domain.railway.app
FRONTEND_PUBLIC_URL=https://your-railway-domain.railway.app
OAUTH_SERVER_URL=https://api.manus.im
JWT_SECRET=<generate a random string, min 32 characters>
OWNER_NAME=Your Company Name
OWNER_OPEN_ID=<from Manus Dashboard>
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=<from Manus Dashboard>
```

### 5. File Storage (Choose One)

**Option A: AWS S3**

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your AWS access key>
AWS_SECRET_ACCESS_KEY=<your AWS secret key>
AWS_S3_BUCKET=your-bucket-name
```

Steps:
1. Create AWS S3 bucket
2. Create IAM user with S3 permissions
3. Generate access keys
4. Add to Railway variables

**Option B: Railway Object Storage**

```
RAILWAY_STORAGE_URL=https://your-storage.railway.app
RAILWAY_STORAGE_KEY=<your storage key>
RAILWAY_STORAGE_SECRET=<your storage secret>
```

Steps:
1. In Railway, add Object Storage service
2. Copy connection details
3. Add to Railway variables

### 6. Email (SMTP)

For sending notifications and emails:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in `SMTP_PASSWORD`

**For other providers:**
- Sendgrid: `smtp.sendgrid.net` port `587`
- Mailgun: `smtp.mailgun.org` port `587`
- AWS SES: `email-smtp.region.amazonaws.com` port `587`

### 7. Twilio (SMS/Voice)

For SMS notifications and voice calls:

```
TWILIO_ACCOUNT_SID=<from Twilio Console>
TWILIO_AUTH_TOKEN=<from Twilio Console>
TWILIO_MESSAGING_SERVICE_SID=<from Twilio Console>
```

Steps:
1. Create Twilio account
2. Create messaging service
3. Add phone numbers
4. Copy credentials to Railway

### 8. Plaid (Banking Integration)

For bank account connections:

```
PLAID_CLIENT_ID=<from Plaid Dashboard>
PLAID_SECRET=<from Plaid Dashboard>
PLAID_ENV=production
```

Steps:
1. Create Plaid account
2. Create application
3. Copy credentials
4. Set `PLAID_ENV` to `production` or `sandbox`

### 9. Google Maps

For map functionality:

```
GOOGLE_MAPS_API_KEY=<from Google Cloud Console>
```

Steps:
1. Create Google Cloud project
2. Enable Maps API
3. Create API key
4. Restrict to your domain

### 10. CORS & Security

```
ALLOWED_ORIGINS=https://your-railway-domain.railway.app,https://www.your-domain.com
CORS_CREDENTIALS=true
```

- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `CORS_CREDENTIALS`: Set to `true` to allow cookies/credentials

### 11. Analytics (Optional)

```
VITE_ANALYTICS_WEBSITE_ID=<your analytics ID>
VITE_ANALYTICS_ENDPOINT=https://analytics.your-domain.com
```

### 12. Branding (Optional)

```
VITE_APP_TITLE=WV Control Center
VITE_APP_LOGO=https://your-cdn.com/logo.png
```

## How to Add Variables in Railway

### Method 1: Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click on Node.js service
4. Go to "Variables" tab
5. Click "Add Variable"
6. Enter key and value
7. Click "Save"

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Add variable
railway variables set KEY=value

# View all variables
railway variables
```

## Generating Secrets

### JWT_SECRET

Generate a secure random string:

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Maximum 256)}))

# Or use online generator
# https://generate-random.org/
```

## Validation

### Check if Variables are Set

In Railway logs, look for:
```
[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
```

If you see errors about missing variables, check:
1. Variable is set in Railway dashboard
2. Spelling is correct (case-sensitive)
3. Value is not empty
4. No extra spaces

### Test API Endpoint

```bash
curl https://your-railway-domain.railway.app/api/trpc/auth.me
```

Should return JSON (not error).

## Troubleshooting

### "Cannot find module" Error

- Check all dependencies are in `package.json`
- Ensure `pnpm-lock.yaml` is committed to git

### "Connection refused" Error

- Check `DATABASE_URL` is correct
- Verify PostgreSQL service is running in Railway
- Check database migrations ran

### "Invalid token" Error

- Check `JWT_SECRET` is set and consistent
- Check `OAUTH_SERVER_URL` is correct
- Verify `VITE_APP_ID` matches Manus dashboard

### "File upload fails" Error

- Check S3 credentials are correct
- Verify S3 bucket permissions
- Check CORS configuration on S3 bucket
- Ensure file size is under 10MB

### "Email not sending" Error

- Check `SMTP_HOST` and `SMTP_PORT`
- Verify `SMTP_USER` and `SMTP_PASSWORD`
- For Gmail, ensure app password is used (not regular password)
- Check firewall allows SMTP port

## Security Best Practices

1. **Never commit `.env` files** to git
2. **Use Railway's secret management** for sensitive values
3. **Rotate secrets regularly** (especially API keys)
4. **Use different keys for development and production**
5. **Restrict API keys** to specific IPs/domains when possible
6. **Monitor logs** for suspicious activity
7. **Use HTTPS only** (Railway provides this automatically)

## Next Steps

1. Gather all required credentials from service providers
2. Add variables to Railway dashboard
3. Deploy application
4. Test all features
5. Monitor logs for errors
6. Set up monitoring/alerts
