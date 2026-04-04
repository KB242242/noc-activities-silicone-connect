const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function asDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function upsertShifts(shifts) {
  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {
        name: shift.name,
        color: shift.color,
        colorCode: shift.colorCode,
        description: shift.description || null,
      },
      create: {
        id: shift.id,
        name: shift.name,
        color: shift.color,
        colorCode: shift.colorCode,
        description: shift.description || null,
      },
    });
  }
}

async function upsertUsers(users) {
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        username: user.username || null,
        passwordHash: user.passwordHash || null,
        role: user.role || 'USER',
        shiftId: user.shiftId || null,
        responsibility: user.responsibility || null,
        shiftPeriodStart: asDate(user.shiftPeriodStart),
        shiftPeriodEnd: asDate(user.shiftPeriodEnd),
        avatar: user.avatar || null,
        isActive: user.isActive !== false,
        isBlocked: user.isBlocked === true,
        isFirstLogin: user.isFirstLogin !== false,
        mustChangePassword: user.mustChangePassword !== false,
        lastActivity: asDate(user.lastActivity),
        failedLoginAttempts: Number.isInteger(user.failedLoginAttempts) ? user.failedLoginAttempts : 0,
        lockedUntil: asDate(user.lockedUntil),
        monthlyScore: typeof user.monthlyScore === 'number' ? user.monthlyScore : null,
        reliabilityIndex: typeof user.reliabilityIndex === 'number' ? user.reliabilityIndex : null,
        performanceBadge: user.performanceBadge || null,
        presenceStatus: user.presenceStatus || 'OFFLINE',
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        username: user.username || null,
        passwordHash: user.passwordHash || null,
        role: user.role || 'USER',
        shiftId: user.shiftId || null,
        responsibility: user.responsibility || null,
        shiftPeriodStart: asDate(user.shiftPeriodStart),
        shiftPeriodEnd: asDate(user.shiftPeriodEnd),
        avatar: user.avatar || null,
        isActive: user.isActive !== false,
        isBlocked: user.isBlocked === true,
        isFirstLogin: user.isFirstLogin !== false,
        mustChangePassword: user.mustChangePassword !== false,
        lastActivity: asDate(user.lastActivity),
        failedLoginAttempts: Number.isInteger(user.failedLoginAttempts) ? user.failedLoginAttempts : 0,
        lockedUntil: asDate(user.lockedUntil),
        monthlyScore: typeof user.monthlyScore === 'number' ? user.monthlyScore : null,
        reliabilityIndex: typeof user.reliabilityIndex === 'number' ? user.reliabilityIndex : null,
        performanceBadge: user.performanceBadge || null,
        presenceStatus: user.presenceStatus || 'OFFLINE',
      },
    });
  }
}

async function upsertConversationWithParticipants(conversationId, title, participantIds, adminId) {
  await prisma.conversation.upsert({
    where: { id: conversationId },
    update: { title },
    create: { id: conversationId, title },
  });

  for (const userId of participantIds) {
    const existing = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.conversationParticipant.update({
        where: { id: existing.id },
        data: {
          role: userId === adminId ? 'admin' : 'member',
        },
      });
    } else {
      await prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId,
          role: userId === adminId ? 'admin' : 'member',
        },
      });
    }
  }
}

async function seedGroupConversations(allUsers) {
  const shiftA = allUsers.filter((u) => u.shiftId === 'shift-a').map((u) => u.id);
  const shiftB = allUsers.filter((u) => u.shiftId === 'shift-b').map((u) => u.id);
  const shiftC = allUsers.filter((u) => u.shiftId === 'shift-c').map((u) => u.id);

  const admin = allUsers.find((u) => u.role === 'SUPER_ADMIN');
  const responsable = allUsers.find((u) => u.role === 'RESPONSABLE');

  const annonceParticipants = allUsers.map((u) => u.id);
  if (admin && !annonceParticipants.includes(admin.id)) annonceParticipants.push(admin.id);
  if (responsable && !annonceParticipants.includes(responsable.id)) annonceParticipants.push(responsable.id);

  await upsertConversationWithParticipants(
    'conv-annonces',
    'Annonces Officielles',
    annonceParticipants,
    admin ? admin.id : annonceParticipants[0]
  );

  if (shiftA.length > 0) {
    await upsertConversationWithParticipants('conv-shift-a', 'Shift A - Team Chat', shiftA, shiftA[0]);
  }
  if (shiftB.length > 0) {
    await upsertConversationWithParticipants('conv-shift-b', 'Shift B - Team Chat', shiftB, shiftB[0]);
  }
  if (shiftC.length > 0) {
    await upsertConversationWithParticipants('conv-shift-c', 'Shift C - Team Chat', shiftC, shiftC[0]);
  }
}

async function main() {
  const backupPath = path.join(process.cwd(), 'backup_users_shifts.json');

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup introuvable: ${backupPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  const users = Array.isArray(payload.users) ? payload.users : [];
  const shifts = Array.isArray(payload.shifts) ? payload.shifts : [];

  if (users.length === 0 || shifts.length === 0) {
    throw new Error('Le backup ne contient pas users/shifts exploitables.');
  }

  await upsertShifts(shifts);
  await upsertUsers(users);
  await seedGroupConversations(users);

  console.log(`Import termine: ${users.length} users, ${shifts.length} shifts, conversations de groupe creees.`);
}

main()
  .catch((error) => {
    console.error('Echec import backup:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
