# Database Migration Guide

After implementing the new features, you need to run a database migration to add the new fields.

## Steps to Update Database

1. **Generate Prisma Client**:
   ```bash
   cd backend
   npm run prisma:generate
   ```

2. **Create Migration**:
   ```bash
   npm run prisma:migrate
   ```
   
   When prompted, name it: `add_approval_and_service_fields`

3. **Apply Migration**:
   The migration will automatically apply. If you need to reset:
   ```bash
   npx prisma migrate reset
   ```

## New Fields Added

### Document Model
- `approvalStatus` (enum: PENDING, APPROVED, REJECTED, NOT_REQUIRED)
- `approvalRequired` (boolean)
- `approvedById` (string, nullable)
- `approvedAt` (DateTime, nullable)
- `rejectionReason` (string, nullable)

### Case Model
- `serviceMethod` (string, nullable)
- `serviceDate` (DateTime, nullable)
- `serviceAffidavitId` (string, nullable)

## Notes

- All new fields are nullable or have default values, so existing data will not be affected
- The migration is backward compatible
- You may need to restart your backend server after migration

