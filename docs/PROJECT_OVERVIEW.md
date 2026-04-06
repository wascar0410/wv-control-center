# WV Control Center - Project Overview

## Project Summary

WV Control Center is a comprehensive transportation and logistics management platform designed for small to medium-sized trucking companies. It provides unified management of operations, finance, fleet, and driver coordination.

## Architecture Overview

### Technology Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Express 4 + tRPC 11 + Node.js
- **Database**: TiDB (MySQL-compatible)
- **Authentication**: Manus OAuth 2.0
- **Real-time**: WebSocket support
- **Storage**: S3 for file storage

### Project Structure

```
wv-control-center/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   ├── _core/            # Core functionality
│   │   └── App.tsx           # Main app component
│   └── index.html            # HTML entry point
├── server/                    # Express backend
│   ├── routers/              # tRPC routers
│   ├── db.ts                 # Database helpers
│   ├── storage.ts            # S3 storage helpers
│   ├── _core/                # Core backend services
│   └── _core/index.ts        # Server entry point
├── drizzle/                  # Database schema & migrations
│   ├── schema.ts             # Table definitions
│   └── migrations/           # SQL migrations
├── shared/                   # Shared code
│   ├── rbac.ts              # Role-based access control
│   └── const.ts             # Constants
└── docs/                     # Documentation
```

## Core Features

### 1. Command Center
- Real-time dashboard with KPIs
- Executive analytics and trends
- Quick actions and shortcuts
- Financial summary

### 2. Operations Management
- **Loads & Dispatch**: Load board with pipeline (available → assigned → in_transit → delivered → invoiced → paid)
- **Quote Analyzer**: Estimated vs actual cost comparison for profitability analysis
- **Fleet Tracking**: Real-time GPS tracking with geofencing

### 3. Driver Management
- **Driver Ops**: Unified driver dashboard with KPIs, load management, and wallet integration
- **Performance Tracking**: Individual driver statistics and trends
- **Feedback System**: Driver performance feedback and ratings

### 4. Financial Management
- **Finance Dashboard**: Consolidated financial overview
- **Invoicing**: Invoice management with aging reports
- **Wallet System**: Driver wallet with balance tracking and withdrawals
- **Settlements**: Profit distribution between partners (50/50 model)

### 5. Team Coordination
- **Alerts & Tasks**: Notification system with task management
- **Chat**: Team messaging
- **User Management**: Role-based user administration

### 6. Role-Based Access Control
- **Admin**: Full system access
- **Owner**: Finance and operational management
- **Dispatcher**: Load and fleet management
- **Driver**: Personal loads and wallet
- **User**: Basic access (chat, profile)

## Database Schema

### Core Tables
- `users` - User accounts and authentication
- `loads` - Freight loads with status tracking
- `drivers` - Driver information and fleet assignment
- `wallets` - Driver wallet balances
- `invoices` - Customer invoices
- `settlements` - Profit distributions
- `alerts` - System notifications
- `tasks` - Team tasks and assignments
- `quote_analysis` - Quote profitability analysis

### Key Relationships
- Users → Drivers (one-to-many)
- Loads → Drivers (many-to-one)
- Loads → Invoices (one-to-many)
- Drivers → Wallets (one-to-one)
- Settlements → Loads (many-to-many via settlement_loads)

## API Architecture

### tRPC Routers
- `auth` - Authentication and session management
- `loads` - Load management
- `drivers` - Driver operations
- `wallet` - Wallet and balance management
- `settlement` - Settlement processing
- `invoicing` - Invoice management
- `quoteAnalysis` - Quote analysis
- `alertsAndTasks` - Alerts and tasks
- `finance` - Financial operations
- `fleet` - Fleet management

### API Conventions
- All endpoints use tRPC procedures
- Protected procedures require authentication
- Admin procedures require admin role
- Data filtering based on user role
- Consistent error handling with TRPCError

## Frontend Architecture

### Component Hierarchy
- `App.tsx` - Main router and layout
- `DashboardLayout.tsx` - Sidebar navigation and layout
- `ProtectedRoute.tsx` - Role-based route protection
- Page components - Feature-specific pages
- UI components - Reusable shadcn/ui components

### State Management
- React Query (via tRPC) for server state
- React Context for auth state
- Local component state for UI

### Styling
- Tailwind CSS 4 with custom theme
- CSS variables for theming
- Responsive design (mobile-first)

## Security

### Authentication
- Manus OAuth 2.0 for user authentication
- Session cookies with secure flags
- CSRF protection

### Authorization
- Role-based access control (RBAC)
- Module-level permissions
- Data-level filtering in tRPC procedures

### Data Protection
- Encrypted database connections
- S3 encryption for file storage
- Input validation and sanitization

## Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization
- CSS minification
- Bundle analysis

### Backend
- Database query optimization
- Connection pooling
- Caching strategies
- Rate limiting

### Deployment
- CDN for static assets
- Gzip compression
- HTTP/2 support

## Development Workflow

### Local Development
```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Database Migrations
```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
# Use webdev_execute_sql tool in Manus
```

### Code Quality
- TypeScript for type safety
- ESLint for code style
- Prettier for formatting
- Vitest for unit testing

## Deployment

### Build Process
1. Frontend build with Vite
2. Backend bundling with esbuild
3. Docker containerization
4. Cloud deployment

### Environment Variables
- `DATABASE_URL` - Database connection
- `JWT_SECRET` - Session signing
- `VITE_APP_ID` - OAuth app ID
- `OAUTH_SERVER_URL` - OAuth server
- `VITE_OAUTH_PORTAL_URL` - OAuth portal

## Monitoring & Logging

### Logs
- `.manus-logs/devserver.log` - Server logs
- `.manus-logs/browserConsole.log` - Client logs
- `.manus-logs/networkRequests.log` - Network logs

### Metrics
- Response times
- Error rates
- User activity
- Financial transactions

## Future Enhancements

### Short-term
1. Real-time notifications (WebSocket)
2. Mobile app (React Native)
3. Advanced analytics and reporting
4. Automated invoice generation

### Medium-term
1. Multi-company support
2. API for third-party integrations
3. Machine learning for route optimization
4. Blockchain for proof of delivery

### Long-term
1. AI-powered dispatch optimization
2. Autonomous vehicle support
3. Predictive maintenance
4. Global expansion features

## Support & Maintenance

### Common Issues
- See RBAC_GUIDE.md for access control issues
- Check logs in `.manus-logs/` for errors
- Review database schema in `drizzle/schema.ts`

### Code Organization
- Keep routers under 150 lines (split into sub-routers)
- Use consistent naming conventions
- Document complex business logic
- Write tests for critical functions

### Contributing
1. Create feature branch
2. Write tests
3. Update documentation
4. Submit for review
5. Deploy to production

## Contact & Resources

- **Documentation**: See `docs/` folder
- **RBAC Guide**: See `docs/RBAC_GUIDE.md`
- **Database Schema**: See `drizzle/schema.ts`
- **API Routes**: See `server/routers/`
