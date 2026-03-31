# WV Control Center - Railway Deployment Setup Summary

## Overview

WV Control Center is now ready for deployment on Railway. This document summarizes the complete setup, files created, and deployment process.

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Platform                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Node.js Service (Single Monolithic App)            │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │ Frontend (React + Vite)                       │  │ │
│  │  │ - Bundled with backend                        │  │ │
│  │  │ - Served as static files                      │  │ │
│  │  │ - HMR disabled in production                  │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │ Backend (Express + tRPC)                      │  │ │
│  │  │ - API endpoints (/api/trpc/*)                │  │ │
│  │  │ - OAuth handling                              │  │ │
│  │  │ - File upload (POD)                           │  │ │
│  │  │ - Location tracking                           │  │ │
│  │  │ - Health checks                               │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                                │
│                          ↓                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Service                                 │ │
│  │  - Managed by Railway                               │ │
│  │  - Auto-backups                                     │ │
│  │  - DATABASE_URL provided automatically              │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                                │
│                          ↓                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  External Services                                  │ │
│  │  - AWS S3 (file storage)                            │ │
│  │  - Manus APIs (OAuth, Forge)                        │ │
│  │  - SMTP (email)                                     │ │
│  │  - Twilio (SMS)                                     │ │
│  │  - Plaid (banking)                                  │ │
│  │  - Google Maps                                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Files Created for Railway Deployment

### 1. **railway.json**
Railway configuration file specifying:
- Build command: `pnpm build`
- Start command: `pnpm start`
- Restart policy: on_failure with max 5 retries

### 2. **Dockerfile**
Multi-stage Docker build for production:
- Build stage: Installs dependencies and builds frontend/backend
- Production stage: Minimal image with only production dependencies
- Health check: Verifies service is running
- Optimized for Railway deployment

### 3. **RAILWAY_DEPLOYMENT.md**
Complete step-by-step deployment guide including:
- Prerequisites
- Repository setup
- Railway project creation
- PostgreSQL configuration
- Environment variable setup
- Deployment process
- Verification steps
- Troubleshooting guide
- Monitoring setup

### 4. **RAILWAY_ENV_VARS.md**
Detailed environment variables reference:
- Quick reference table
- Detailed configuration for each service
- How to add variables in Railway
- Generating secrets
- Validation procedures
- Security best practices

### 5. **server/production.config.ts**
Production configuration object containing:
- Server settings (port, environment)
- Database configuration
- CORS and security settings
- File upload limits
- S3 configuration
- Email (SMTP) settings
- Twilio configuration
- Plaid configuration
- Google Maps API key
- Rate limiting settings
- Performance settings
- Security headers
- Validation function

### 6. **server/health.ts**
Health check endpoints for Railway:
- `/health` - Basic health check
- `/health/detailed` - Detailed health information
- `/ready` - Readiness probe
- `/alive` - Liveness probe

## Build and Start Commands

### Build Command
```bash
pnpm build
```

This command:
1. Builds frontend with Vite: `vite build`
2. Bundles backend with esbuild: `esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
3. Creates `/dist` directory with:
   - `index.js` - Backend server
   - `public/` - Frontend static files

### Start Command
```bash
pnpm start
```

This command:
1. Sets `NODE_ENV=production`
2. Runs `node dist/index.js`
3. Starts Express server on port from `PORT` environment variable
4. Serves frontend static files
5. Handles API requests

## Environment Variables Required

### Minimum Required (for basic functionality)
```
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3000
VITE_APP_ID=...
VITE_OAUTH_PORTAL_URL=https://your-domain.railway.app
OAUTH_SERVER_URL=https://api.manus.im
JWT_SECRET=<32+ character secret>
OWNER_NAME=Your Company
OWNER_OPEN_ID=...
BACKEND_PUBLIC_URL=https://your-domain.railway.app
FRONTEND_PUBLIC_URL=https://your-domain.railway.app
```

### Additional Services (as needed)
- **File Storage**: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
- **Email**: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
- **SMS**: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID
- **Banking**: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV
- **Maps**: GOOGLE_MAPS_API_KEY
- **Manus APIs**: BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, VITE_FRONTEND_FORGE_API_KEY, VITE_FRONTEND_FORGE_API_URL

See **RAILWAY_ENV_VARS.md** for complete reference.

## Deployment Steps

### Quick Start (5 minutes)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Railway Project**
   - Go to railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `wv-control-center`

3. **Add PostgreSQL**
   - In Railway project, click "Add Service"
   - Select "PostgreSQL"
   - Railway provides DATABASE_URL automatically

4. **Add Environment Variables**
   - Click Node.js service
   - Go to "Variables" tab
   - Add all required variables from RAILWAY_ENV_VARS.md

5. **Deploy**
   - Railway automatically deploys when variables are set
   - Watch deployment progress in "Deployments" tab
   - Once deployed, your app is live at `your-domain.railway.app`

### Detailed Steps

See **RAILWAY_DEPLOYMENT.md** for comprehensive step-by-step guide.

## Key Features for Railway

### 1. Health Checks
The application includes health check endpoints that Railway uses to:
- Verify service is running
- Route traffic only to healthy instances
- Auto-restart if unhealthy

```bash
curl https://your-domain.railway.app/health
```

### 2. Graceful Shutdown
The application handles SIGTERM signals gracefully:
- Closes database connections
- Stops accepting new requests
- Completes in-flight requests
- Exits cleanly

### 3. Environment-Based Configuration
All configuration comes from environment variables:
- No hardcoded values
- Easy to switch between environments
- Railway can inject variables automatically

### 4. Production Optimizations
- Gzip compression enabled
- Cache headers configured
- Security headers set
- Rate limiting configured
- Error handling implemented

## Database Setup

### Initial Migration

After first deployment, run database migrations:

```bash
# Via Railway CLI
railway run pnpm db:push

# Or manually connect and run
# pnpm db:push
```

This creates all tables:
- users
- loads
- podDocuments
- driverLocations
- And others...

### Database Backups

Railway automatically:
- Creates daily backups
- Retains backups for 7 days
- Allows point-in-time recovery
- No manual configuration needed

## File Upload (POD - Proof of Delivery)

### S3 Configuration

Files are uploaded to AWS S3:

1. **Create S3 Bucket**
   - Name: `wv-control-center-prod` (or your choice)
   - Region: Same as your Railway region
   - Block public access: Off (for public URLs)

2. **Create IAM User**
   - Permissions: S3 full access
   - Generate access keys
   - Add to Railway variables

3. **Configure CORS** (if needed)
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://your-domain.railway.app"],
         "AllowedMethods": ["GET", "PUT", "POST"],
         "AllowedHeaders": ["*"]
       }
     ]
   }
   ```

### File Upload Limits
- Maximum file size: 10MB per file
- Allowed types: JPEG, PNG, WebP, PDF
- Multiple files per delivery supported

## WebSocket Configuration

### Production Setup
- HMR (Hot Module Replacement) is disabled
- WebSocket errors should not appear in production
- If you see WebSocket errors, check:
  - `hmr: false` in vite.config.ts ✓ (already configured)
  - No dev-only code in production build ✓ (already handled)

## Monitoring and Logs

### View Logs in Railway

1. Go to railway.app
2. Open your project
3. Click Node.js service
4. Go to "Logs" tab
5. See real-time logs

### Key Log Messages

**Startup:**
```
[Production Config] Loaded configuration:
  - Node Environment: production
  - Port: 3000
  - Backend URL: https://your-domain.railway.app
  - Database: ✓ Configured
```

**Ready:**
```
Server running on http://localhost:3000/
```

**Errors:**
```
[Error] Cannot connect to database
[Error] Missing environment variable: JWT_SECRET
```

## Scaling Strategy

### Current (Single Service)
- One Node.js instance
- Suitable for: <1000 concurrent users
- Cost: Minimal

### Future (When Needed)
1. **Vertical Scaling** - Increase CPU/Memory
2. **Horizontal Scaling** - Multiple instances with load balancer
3. **Service Split** - Separate frontend and backend services
4. **Database Optimization** - Read replicas, caching layer

## Troubleshooting

### Build Fails
- Check `pnpm-lock.yaml` is committed
- Verify all dependencies are in `package.json`
- Check build command in `package.json`

### Deployment Fails
- Check all required environment variables are set
- Verify DATABASE_URL format
- Check logs for specific errors

### Application Crashes
- Check logs for error messages
- Verify environment variables are correct
- Check database connectivity
- Verify file storage credentials

### Performance Issues
- Monitor CPU and memory in Railway dashboard
- Check database query performance
- Consider caching layer (Redis)
- Optimize frontend bundle size

See **RAILWAY_DEPLOYMENT.md** for detailed troubleshooting.

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use Railway's secret management
   - Rotate keys regularly

2. **CORS**
   - Only allow your domain
   - Use HTTPS only
   - Set credentials appropriately

3. **Database**
   - Use strong passwords
   - Enable SSL connections
   - Regular backups (Railway handles this)

4. **File Upload**
   - Validate file types
   - Limit file size
   - Use signed URLs for downloads
   - Scan for malware (optional)

5. **API Keys**
   - Never expose in frontend code
   - Use server-side only for sensitive keys
   - Rotate regularly
   - Monitor usage

## Next Steps After Deployment

1. **Test All Features**
   - Login with OAuth
   - Create a load
   - Upload POD photos
   - Test location tracking
   - Verify offline queue

2. **Set Up Monitoring**
   - Enable Railway alerts
   - Set up error tracking (Sentry)
   - Monitor performance (DataDog)
   - Set up uptime monitoring

3. **Configure Custom Domain**
   - Add your domain to Railway
   - Update DNS records
   - Verify SSL certificate

4. **Optimize Performance**
   - Enable caching
   - Optimize database queries
   - Compress assets
   - Consider CDN

5. **Plan for Growth**
   - Monitor usage metrics
   - Plan scaling strategy
   - Consider service split
   - Evaluate caching layer

## Future Refactoring

When the app grows, consider:

1. **Split into Microservices**
   - Frontend service (static)
   - Backend service (API)
   - Separate scaling

2. **Add Caching Layer**
   - Redis for sessions
   - Cache frequently accessed data
   - Reduce database load

3. **Add CDN**
   - Serve static assets globally
   - Reduce latency
   - Lower bandwidth costs

4. **Database Optimization**
   - Add read replicas
   - Implement connection pooling
   - Optimize queries

5. **Add Monitoring**
   - Application Performance Monitoring (APM)
   - Error tracking
   - User analytics

## Support and Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Node.js Best Practices**: https://nodejs.org/en/docs/guides/
- **Express Documentation**: https://expressjs.com/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

## Summary

WV Control Center is now fully prepared for Railway deployment:

✅ Build configuration optimized  
✅ Production settings configured  
✅ Health checks implemented  
✅ Environment variables documented  
✅ Deployment guide created  
✅ Troubleshooting guide included  
✅ Security best practices documented  

**Ready to deploy!** Follow the steps in RAILWAY_DEPLOYMENT.md to get started.
