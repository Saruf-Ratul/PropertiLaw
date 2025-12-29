# PropertiLaw Platform - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Installation Steps

### 1. Install Dependencies

```bash
# Root level
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE propertilaw;
```

2. Configure environment variables:
   - Copy `backend/.env.example` to `backend/.env`
   - Update `DATABASE_URL` with your PostgreSQL credentials:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/propertilaw?schema=public"
   ```

3. Run Prisma migrations:
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

4. (Optional) Seed the database with sample data:
```bash
npm run seed
```

This creates:
- A law firm
- Admin user: `admin@lawfirm.com` / `admin123`
- Attorney user: `attorney@lawfirm.com` / `attorney123`
- A property management client
- Client user: `manager@abcpm.com` / `client123`
- Sample property, tenant, and case

### 3. Backend Setup

1. Configure backend environment variables in `backend/.env`:
   - `JWT_SECRET`: A secure random string for JWT tokens
   - `PORT`: Backend server port (default: 3001)
   - `FRONTEND_URL`: Frontend URL (default: http://localhost:3000)

2. Create uploads directory:
```bash
mkdir -p backend/uploads
```

3. Start the backend server:
```bash
cd backend
npm run dev
```

The backend will run on http://localhost:3001

### 4. Frontend Setup

1. Configure frontend environment variables (optional):
   - Create `frontend/.env` if needed:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

The frontend will run on http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Login with one of the seeded accounts:
   - Admin: `admin@lawfirm.com` / `admin123`
   - Attorney: `attorney@lawfirm.com` / `attorney123`
   - Client: `manager@abcpm.com` / `client123`

## Project Structure

```
propertilaw/
├── backend/              # Backend API
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── middleware/   # Auth, error handling
│   │   ├── services/    # Business logic
│   │   └── scripts/     # Seed scripts
│   ├── prisma/          # Database schema
│   └── uploads/         # Document storage
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/ # Reusable components
│   │   ├── store/      # State management
│   │   └── api/        # API client
└── README.md
```

## Development

### Database Management

- View database: `npm run db:studio` (from backend directory)
- Create migration: `npm run db:migrate` (from backend directory)
- Reset database: `npx prisma migrate reset` (from backend directory)

### Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the dist/ directory with a web server
```

## Features Implemented

✅ User authentication and authorization
✅ Case management (CRUD operations)
✅ Property and tenant management
✅ Document upload and download
✅ Comments/notes on cases
✅ Dashboard with statistics
✅ Reports and analytics
✅ Multi-role access control (Firm users vs Client users)
✅ Database schema with all core entities

## Next Steps

- [ ] Implement document generation from templates
- [ ] Add RentManager API integration
- [ ] Add Yardi Breeze integration
- [ ] Implement e-filing integration (Phase 3)
- [ ] Add email notifications
- [ ] Enhance reporting with charts
- [ ] Add case intake wizard
- [ ] Implement document templates management

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Verify database exists

### Port Already in Use
- Change PORT in backend/.env
- Update FRONTEND_URL if backend port changes

### Authentication Errors
- Check JWT_SECRET is set in backend/.env
- Clear browser localStorage and login again

## Support

For issues or questions, please refer to the main README.md or create an issue in the repository.

