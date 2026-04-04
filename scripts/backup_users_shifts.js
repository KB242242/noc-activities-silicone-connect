// Script de sauvegarde des utilisateurs et groupes
// Exporte les données des tables users, shifts, et leurs relations

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backup() {
  const users = await prisma.user.findMany({
    include: {
      shift: true,
      assignedTickets: true,
      reportedTickets: true,
      // Ajoute ici d'autres relations à sauvegarder si besoin
    }
  });
  const shifts = await prisma.shift.findMany({
    include: {
      members: true
    }
  });
  const data = { users, shifts };
  fs.writeFileSync('backup_users_shifts.json', JSON.stringify(data, null, 2), 'utf-8');
  console.log('Sauvegarde terminée dans backup_users_shifts.json');
}

backup().finally(() => prisma.$disconnect());
