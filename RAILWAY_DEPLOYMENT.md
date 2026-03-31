# WV Control Center - Railway Deployment Guide

This guide explains how to deploy WV Control Center to Railway with a stable, production-ready setup.

## Current Architecture

**Single Monolithic Service:**
- Frontend (React + Vite) bundled with backend
- Backend (Express + tRPC) serving both API and static frontend
- PostgreSQL database (provided by Railway)
- File storage (S3 or Railway Object Storage)

**Why this approach:**
- Simpler initial deployment
- Fewer moving parts
- Easier to debug
- Can be split into microservices later if needed

## Prerequisites

1. **GitHub Account** - For repository and autodeploy
2. **Railway Account** - For hosting (railway.app)
3. **PostgreSQL Database** - Railway provides this
4. **Environment Variables** - See section below

## Step 1: Prepare Your Repository

### 1.1 Ensure GitHub Repository is Set Up

```bash
# If not already in git
git init
git add .
git commit -m "Initial commit - Railway deployment ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wv-control-center.git
git push -u origin main
```

### 1.2 Verify Build and Start Scripts

The `package.json` should have these scripts:

```json
{
  "scripts": {
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts"
  }
}
```

## Step 2: Create Railway Project

### 2.1 Log in to Railway

Go to [railway.app](https://railway.app) and log in with your GitHub account.

### 2.2 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your `wv-control-center` repository
4. Railway will automatically detect the Node.js project

### 2.3 Add PostgreSQL Service

1. In your Railway project, click "Add Service"
2. Select "PostgreSQL"
3. Railway will create a PostgreSQL instance and provide `DATABASE_URL`

## Step 3: Configure Environment Variables

### 3.1 In Railway Dashboard

1. Go to your project
2. Click on the Node.js service
3. Go to "Variables" tab
4. Add all required environment variables (see list below)

### 3.2 Required Environment Variables

**Database:**
```
DATABASE_URL=postgresql://user:password@host:5432/database
```
(Railway auto-provides this from PostgreSQL service)

**Application:**
```
NODE_ENV=production
PORT=3000
```

**Frontend URLs:**
```
VITE_APP_ID=your_manus_app_id
VITE_OAUTH_PORTAL_URL=https://your-railway-domain.railway.app
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
```

**Backend URLs:**
```
BACKEND_PUBLIC_URL=https://your-railway-domain.railway.app
FRONTEND_PUBLIC_URL=https://your-railway-domain.railway.app
```

**OAuth & Auth:**
```
OAUTH_SERVER_URL=https://api.manus.im
JWT_SECRET=your_secret_key_min_32_chars
```

**Owner Info:**
```
OWNER_NAME=Your Company Name
OWNER_OPEN_ID=your_owner_id
```

**Manus APIs:**
```
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_key
```

**File Storage (choose one):**

Option A - AWS S3:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your-bucket
```

Option B - Railway Object Storage:
```
RAILWAY_STORAGE_URL=https://your-storage.railway.app
RAILWAY_STORAGE_KEY=your_key
RAILWAY_STORAGE_SECRET=your_secret
```

**Email (SMTP):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your_app_password
```

**Twilio (SMS/Voice):**
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_MESSAGING_SERVICE_SID=your_service_id
```

**Plaid (Banking):**
```
PLAID_CLIENT_ID=your_id
PLAID_SECRET=your_secret
PLAID_ENV=production
```

**Google Maps:**
```
GOOGLE_MAPS_API_KEY=your_key
```

**CORS & Security:**
```
ALLOWED_ORIGINS=https://your-railway-domain.railway.app
CORS_CREDENTIALS=true
```

## Step 4: Deploy

### 4.1 Automatic Deployment

Railway will automatically deploy when you push to `main` branch:

```bash
git push origin main
```

Watch the deployment in Railway dashboard:
- Build logs appear in real-time
- Deployment status shows progress
- Once deployed, your app is live

### 4.2 Manual Deployment (if needed)

In Railway dashboard:
1. Go to your Node.js service
2. Click "Deploy" button
3. Select the branch to deploy

## Step 5: Verify Deployment

### 5.1 Check Service Status

1. Go to Railway project
2. Click on Node.js service
3. Check "Deployments" tab for latest deployment status
4. Check "Logs" for any errors

### 5.2 Test the Application

```bash
# Test API endpoint
curl https://your-railway-domain.railway.app/api/health

# Test frontend
open https://your-railway-domain.railway.app
```

### 5.3 Database Migration

If this is first deployment, run database migrations:

```bash
# Via Railway CLI
railway run pnpm db:push

# Or manually via SSH
# Connect to Railway container and run:
# pnpm db:push
```

## Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain

1. In Railway project, click on Node.js service
2. Go to "Settings" tab
3. Scroll to "Domains"
4. Click "Add Domain"
5. Enter your domain (e.g., `app.yourdomain.com`)
6. Follow DNS setup instructions

### 6.2 Configure DNS

Update your domain's DNS records:
```
CNAME: your-railway-domain.railway.app
```

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Ensure all dependencies are in `package.json`
- Check `pnpm-lock.yaml` is committed to git
- Run `pnpm install` locally and verify

**Error: "Port already in use"**
- Railway automatically assigns PORT via environment variable
- Ensure code uses `process.env.PORT` not hardcoded port

### Application Crashes After Deploy

**Check logs:**
1. Go to Node.js service in Railway
2. Click "Logs" tab
3. Look for error messages

**Common issues:**
- Missing environment variables → Add to Railway dashboard
- Database connection failed → Check DATABASE_URL
- Missing dependencies → Run `pnpm install` locally, commit lock file

### WebSocket Connection Errors

**If you see "failed to connect to websocket":**
- This is HMR (Hot Module Replacement) trying to connect in production
- Ensure `hmr: false` in `vite.config.ts`
- Already configured in this project

### File Upload Fails

**If POD (Proof of Delivery) uploads fail:**
- Check S3 credentials are correct
- Verify S3 bucket permissions
- Check file size limits (max 10MB per file)
- Ensure CORS is configured on S3 bucket

## Production Checklist

- [ ] Database migrations run successfully
- [ ] All environment variables set in Railway
- [ ] Frontend loads without errors
- [ ] API endpoints respond correctly
- [ ] File uploads work (test POD)
- [ ] Location tracking works
- [ ] Offline queue syncs properly
- [ ] Email notifications send
- [ ] Custom domain configured (if using)
- [ ] SSL certificate auto-renewed (Railway handles this)

## Monitoring

### 1. View Logs

```bash
# Via Railway CLI
railway logs

# Or in dashboard:
# Service → Logs tab
```

### 2. Monitor Metrics

In Railway dashboard:
- CPU usage
- Memory usage
- Network I/O
- Deployment history

### 3. Set Up Alerts (Optional)

Railway can notify you of:
- Deployment failures
- High CPU/memory usage
- Service crashes

## Scaling

### Vertical Scaling (Increase Resources)

1. In Railway project, click Node.js service
2. Go to "Settings"
3. Adjust "Compute" (CPU/Memory)
4. Service restarts with new resources

### Horizontal Scaling (Multiple Instances)

Not yet needed for this architecture, but if traffic grows:
1. Consider splitting into frontend + backend services
2. Add load balancer
3. Scale backend instances independently

## Future Improvements

### 1. Split into Microservices

When traffic grows, split into:
- **Frontend Service** - React + Vite (static)
- **Backend Service** - Express + tRPC (API)
- **PostgreSQL** - Shared database
- **Redis** - Cache layer (optional)

### 2. Add Caching

- Redis for session storage
- CDN for static assets
- Database query caching

### 3. Add Monitoring

- Sentry for error tracking
- DataDog for APM
- LogRocket for session replay

### 4. Optimize Performance

- Database indexing
- Query optimization
- Frontend code splitting
- Image optimization

## Support

For Railway-specific issues:
- [Railway Docs](https://docs.railway.app)
- [Railway Discord Community](https://discord.gg/railway)

For WV Control Center issues:
- Check application logs
- Review database migrations
- Verify environment variables

## Notes

- **Build time:** ~5-10 minutes (first deploy may be slower)
- **Deployment time:** ~2-3 minutes
- **Downtime:** Minimal (Rolling deployment)
- **Auto-restart:** Enabled (service restarts on crash)
- **SSL:** Automatic (Railway provides free SSL)
