import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create law firm
  const lawFirm = await prisma.lawFirm.create({
    data: {
      name: 'Sample Law Firm',
      address: '123 Legal Street, Suite 100',
      phone: '(555) 123-4567',
      email: 'info@samplelawfirm.com'
    }
  });

  console.log('✅ Created law firm:', lawFirm.name);

  // Create firm admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.firmUser.create({
    data: {
      email: 'admin@lawfirm.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'LAW_FIRM_ADMIN',
      lawFirmId: lawFirm.id
    }
  });

  console.log('✅ Created admin user:', admin.email);

  // Create attorney user
  const attorneyPassword = await bcrypt.hash('attorney123', 10);
  const attorney = await prisma.firmUser.create({
    data: {
      email: 'attorney@lawfirm.com',
      passwordHash: attorneyPassword,
      firstName: 'John',
      lastName: 'Attorney',
      role: 'ATTORNEY',
      lawFirmId: lawFirm.id
    }
  });

  console.log('✅ Created attorney user:', attorney.email);

  // Create property management client
  const client = await prisma.propertyMgmtClient.create({
    data: {
      name: 'ABC Property Management',
      primaryContact: 'Jane Manager',
      email: 'jane@abcpm.com',
      phone: '(555) 987-6543',
      address: '456 Property Ave',
      lawFirmId: lawFirm.id
    }
  });

  console.log('✅ Created client:', client.name);

  // Create client user
  const clientPassword = await bcrypt.hash('client123', 10);
  const clientUser = await prisma.clientUser.create({
    data: {
      email: 'manager@abcpm.com',
      passwordHash: clientPassword,
      firstName: 'Jane',
      lastName: 'Manager',
      role: 'CLIENT_ADMIN',
      clientId: client.id
    }
  });

  console.log('✅ Created client user:', clientUser.email);

  // Create property
  const property = await prisma.property.create({
    data: {
      name: 'Sunset Apartments',
      address: '789 Main Street',
      city: 'Newark',
      state: 'NJ',
      zipCode: '07102',
      county: 'Essex',
      jurisdiction: 'Essex County, NJ',
      clientId: client.id
    }
  });

  console.log('✅ Created property:', property.name);

  // Create unit
  const unit = await prisma.unit.create({
    data: {
      unitNumber: '101',
      propertyId: property.id
    }
  });

  console.log('✅ Created unit:', unit.unitNumber);

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@email.com',
      phone: '(555) 111-2222',
      unitId: unit.id,
      propertyId: property.id,
      clientId: client.id,
      currentBalance: 2500.00,
      isActive: true
    }
  });

  console.log('✅ Created tenant:', `${tenant.firstName} ${tenant.lastName}`);

  // Create sample case
  const sampleCase = await prisma.case.create({
    data: {
      caseNumber: 'CASE-' + client.id.slice(0, 8).toUpperCase() + '-000001',
      clientId: client.id,
      propertyId: property.id,
      assignedAttorneyId: attorney.id,
      type: 'NON_PAYMENT',
      reason: 'Non-payment of rent',
      amountOwed: 2500.00,
      monthsOwed: 2,
      jurisdiction: 'Essex County, NJ',
      court: 'Essex County Superior Court',
      status: 'OPEN',
      tenants: {
        create: {
          tenantId: tenant.id,
          isPrimary: true
        }
      }
    }
  });

  console.log('✅ Created sample case:', sampleCase.caseNumber);

  // Create case event
  await prisma.caseEvent.create({
    data: {
      caseId: sampleCase.id,
      eventType: 'CASE_CREATED',
      title: 'Case Created',
      description: 'Case created and assigned',
      eventDate: new Date(),
      isCompleted: true
    }
  });

  console.log('✅ Created case event');

  console.log('\n🎉 Seeding completed!');
  console.log('\nTest accounts:');
  console.log('Admin: admin@lawfirm.com / admin123');
  console.log('Attorney: attorney@lawfirm.com / attorney123');
  console.log('Client: manager@abcpm.com / client123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

