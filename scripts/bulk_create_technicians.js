const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const db = new PrismaClient();

const DEFAULT_PASSWORD = 'Adminsc@26';

// Simple hash function matching the frontend utils
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash)}_${password.length}_${Buffer.from(password.slice(0, 3)).toString('base64')}`;
}

const technicians = [
  { name: 'Alfred MOKOBI EBALE', email: 'alfred.mokobi@siliconeconnect.com' },
  { name: 'Bonheur CHRIST MPAN', email: 'bonheur.christ-mpan@siliconeconnect.com' },
  { name: 'Brice ANGOR', email: 'brice.angor@siliconeconnect.com' },
  { name: 'Béni Mendouga', email: 'beni.mendouga@siliconeconnect.com' },
  { name: 'Dady Azumy', email: 'dady.azumy@siliconeconnect.com' },
  { name: 'Divin DIAKOUKA', email: 'divin.diakouka@siliconeconnect.com' },
  { name: 'Franchise MBABOU', email: 'franchise.mbabou@siliconeconnect.com' },
  { name: 'Freddy Manginda', email: 'freddy.manginda@siliconeconnect.com' },
  { name: 'Isidore TATY', email: 'isidore.taty@siliconeconnect.com' },
  { name: 'Jean Michel OPOKO', email: 'jean-michel.opoko@siliconeconnect.com' },
  { name: 'Jerry LUZIZILA', email: 'jerry.luzizila@siliconeconnect.com' },
  { name: 'Jonathan BOUYA', email: 'jonathan.bouya@siliconeconnect.com' },
  { name: 'José NGONKOLI', email: 'jose.ngonkoli@siliconeconnect.com' },
  { name: 'Jourdelan BASSOLA', email: 'jourdelan.bassola@siliconeconnect.com' },
  { name: 'Marly POUABOUD', email: 'marly.pouaboud@siliconeconnect.com' },
  { name: 'Prince MAFOUKILA', email: 'prince.mafoukila@siliconeconnect.com' },
  { name: 'Sanat LOUBASSOU', email: 'sanat.loubassou@siliconeconnect.com' },
  { name: 'Séphora EKABA', email: 'sephora.ekaba@siliconeconnect.com' },
  { name: 'Séverin Ndandou', email: 'severin.ndandou@siliconeconnect.com' },
  { name: 'Uriel POATY MAVHU', email: 'uriel.poaty-mavhu@siliconeconnect.com' },
  { name: 'Venance Ngoma', email: 'venance.ngoma@siliconeconnect.com' },
  { name: 'lotti SEHOSSOLO', email: 'lotti.sehossolo@siliconeconnect.com' },
];

async function main() {
  try {
    console.log('Starting bulk technician creation...\n');

    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const tech of technicians) {
      try {
        // Parse name into first and last
        const nameParts = tech.name.trim().split(' ');
        const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
        const lastName = nameParts.slice(-1)[0] || '';

        // Check if user with email already exists
        const existing = await db.user.findUnique({
          where: { email: tech.email },
        });

        if (existing) {
          console.log(`⊘ SKIPPED: ${tech.name} (${tech.email}) - already exists`);
          results.skipped += 1;
          continue;
        }

        // Create new technician user
        const newUser = await db.user.create({
          data: {
            id: `tech-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            email: tech.email,
            name: tech.name,
            firstName,
            lastName,
            username: tech.email.split('@')[0],
            passwordHash: hashPassword(DEFAULT_PASSWORD),
            role: 'TECHNICIEN',
            isActive: true,
            isBlocked: false,
            isFirstLogin: true,
            mustChangePassword: true,
            failedLoginAttempts: 0,
          },
        });

        console.log(`✓ CREATED: ${tech.name} (${tech.email})`);
        results.created += 1;
      } catch (err) {
        console.error(`✗ FAILED: ${tech.name} - ${err.message}`);
        results.failed += 1;
        results.errors.push({ name: tech.name, error: err.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Bulk Creation Summary:');
    console.log(`  Created: ${results.created}`);
    console.log(`  Skipped: ${results.skipped}`);
    console.log(`  Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach((err) => {
        console.log(`  - ${err.name}: ${err.error}`);
      });
    }

    console.log('='.repeat(60));

    // Show final count
    const totalUsers = await db.user.count();
    const activeTechnicians = await db.user.count({
      where: { isActive: true, role: 'TECHNICIEN' },
    });

    console.log(`\nTotal users in database: ${totalUsers}`);
    console.log(`Active technicians: ${activeTechnicians}`);

    await db.$disconnect();
  } catch (err) {
    console.error('Fatal error:', err);
    await db.$disconnect();
    process.exit(1);
  }
}

main();
