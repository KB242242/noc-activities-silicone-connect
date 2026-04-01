import { PrismaClient, Role, DayType, ResponsibilityType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Shifts
  const shiftA = await prisma.shift.upsert({
    where: { name: 'A' },
    update: {},
    create: {
      name: 'A',
      color: 'blue',
      colorCode: '#3B82F6',
      description: 'Shift A - Blue Team'
    }
  });

  const shiftB = await prisma.shift.upsert({
    where: { name: 'B' },
    update: {},
    create: {
      name: 'B',
      color: 'yellow',
      colorCode: '#EAB308',
      description: 'Shift B - Yellow Team'
    }
  });

  const shiftC = await prisma.shift.upsert({
    where: { name: 'C' },
    update: {},
    create: {
      name: 'C',
      color: 'green',
      colorCode: '#22C55E',
      description: 'Shift C - Green Team'
    }
  });

  console.log('✅ Shifts created');

  // Create Users for Shift A
  const shiftAMembers = [
    { email: 'alaine@siliconeconnect.com', name: 'Alaine', firstName: 'Alaine', lastName: '' },
    { email: 'casimir@siliconeconnect.com', name: 'Casimir', firstName: 'Casimir', lastName: '' },
    { email: 'luca@siliconeconnect.com', name: 'Luca', firstName: 'Luca', lastName: '' },
    { email: 'jose@siliconeconnect.com', name: 'José', firstName: 'José', lastName: '' }
  ];

  for (const member of shiftAMembers) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        email: member.email,
        name: member.name,
        firstName: member.firstName,
        lastName: member.lastName,
        role: Role.AGENT,
        shiftId: shiftA.id,
        isActive: true
      }
    });
  }

  // Create Users for Shift B
  const shiftBMembers = [
    { email: 'sahra@siliconeconnect.com', name: 'Sahra', firstName: 'Sahra', lastName: '' },
    { email: 'severin@siliconeconnect.com', name: 'Severin', firstName: 'Severin', lastName: '' },
    { email: 'marly@siliconeconnect.com', name: 'Marly', firstName: 'Marly', lastName: '' },
    { email: 'furys@siliconeconnect.com', name: 'Furys', firstName: 'Furys', lastName: '' }
  ];

  for (const member of shiftBMembers) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        email: member.email,
        name: member.name,
        firstName: member.firstName,
        lastName: member.lastName,
        role: Role.AGENT,
        shiftId: shiftB.id,
        isActive: true
      }
    });
  }

  // Create Users for Shift C
  const shiftCMembers = [
    { email: 'audrey@siliconeconnect.com', name: 'Audrey', firstName: 'Audrey', lastName: '' },
    { email: 'lapreuve@siliconeconnect.com', name: 'Lapreuve', firstName: 'Lapreuve', lastName: '' },
    { email: 'lotti@siliconeconnect.com', name: 'Lotti', firstName: 'Lotti', lastName: '' },
    { email: 'kevine@siliconeconnect.com', name: 'Kevine', firstName: 'Kevine', lastName: '' }
  ];

  for (const member of shiftCMembers) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        email: member.email,
        name: member.name,
        firstName: member.firstName,
        lastName: member.lastName,
        role: Role.AGENT,
        shiftId: shiftC.id,
        isActive: true
      }
    });
  }

  console.log('✅ Users created');

  // Create Admin user
  await prisma.user.upsert({
    where: { email: 'admin@siliconeconnect.com' },
    update: {},
    create: {
      email: 'admin@siliconeconnect.com',
      name: 'Admin',
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isActive: true
    }
  });

  // Create Supervisor user
  await prisma.user.upsert({
    where: { email: 'supervisor@siliconeconnect.com' },
    update: {},
    create: {
      email: 'supervisor@siliconeconnect.com',
      name: 'Supervisor',
      firstName: 'Super',
      lastName: 'Visor',
      role: Role.SUPERVISOR,
      isActive: true
    }
  });

  console.log('✅ Admin and Supervisor created');

  // Create system settings
  await prisma.systemSetting.upsert({
    where: { key: 'cycleStartDate' },
    update: { value: '2026-02-01' },
    create: {
      key: 'cycleStartDate',
      value: '2026-02-01',
      description: 'Start date for cycle calculation'
    }
  });

  await prisma.systemSetting.upsert({
    where: { key: 'overtimeRate' },
    update: { value: '120' },
    create: {
      key: 'overtimeRate',
      value: '120',
      description: 'Overtime duration in minutes per worked day'
    }
  });

  console.log('✅ System settings created');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
