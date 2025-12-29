# PropertiLaw Platform

A comprehensive legal case management platform tailored for law firms handling landlord-tenant eviction cases.

## Features

- **Case Management**: Full lifecycle management of eviction cases from intake to closure
- **Document Generation**: Automated generation of legal documents based on jurisdiction-specific templates
- **Property Management Integration**: Sync with RentManager and Yardi Breeze
- **Multi-Role Access Control**: Separate interfaces for law firm staff and property management clients
- **Reporting & Analytics**: Dashboards and reports for tracking case metrics
- **Electronic Court Filing**: Integration with e-filing services (Phase 3)

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL
- **Authentication**: JWT

## Getting Started

See [SETUP.md](./SETUP.md) for detailed installation instructions.

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Set up database:**
   - Create PostgreSQL database
   - Copy `backend/.env.example` to `backend/.env` and configure `DATABASE_URL`
   - Run migrations: `cd backend && npm run prisma:migrate`
   - Seed data: `cd backend && npm run seed`

3. **Start servers:**
   ```bash
   # Terminal 1 - Backend (port 3001)
   cd backend && npm run dev

   # Terminal 2 - Frontend (port 3000)
   cd frontend && npm run dev
   ```

4. **Login:**
   - Admin: `admin@lawfirm.com` / `admin123`
   - Attorney: `attorney@lawfirm.com` / `attorney123`
   - Client: `manager@abcpm.com` / `client123`

## Project Structure

```
propertilaw/
├── backend/              # Backend API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth, error handling
│   │   ├── services/    # Business logic
│   │   └── scripts/     # Database seeding
│   ├── prisma/          # Database schema
│   └── uploads/         # Document storage
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   ├── store/       # State management (Zustand)
│   │   └── api/         # API client
│   └── public/          # Static assets
├── SETUP.md            # Detailed setup guide
└── README.md           # This file
```

## Key Features

### ✅ Implemented (Phase 1)

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Case Management**: Full CRUD operations for eviction cases
- **Property & Tenant Management**: View and manage properties and tenants
- **Document Management**: Upload, download, and organize case documents
- **Comments & Notes**: Internal and client-visible comments on cases
- **Dashboard**: Overview statistics and key metrics
- **Reports**: Case volume and timeline analytics
- **Multi-tenant Architecture**: Secure data isolation between clients
- **Database Schema**: Complete Prisma schema with all core entities

### 🚧 Planned (Phase 2-3)

- Document template management and generation
- RentManager API integration
- Yardi Breeze integration (API & SFTP)
- Electronic court filing (e-filing)
- Email notifications
- Advanced analytics and charts
- Case intake wizard
- Bulk operations

## License

ISC

