const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  const missingNames = ['Béni Mendouga', 'José NGONKOLI', 'Séverin Ndandou'];
  
  console.log('Checking database for missing technicians:\n');
  
  for (const name of missingNames) {
    const users = await db.user.findMany({
      where: { name: { contains: name } },
      select: { name: true, email: true, role: true, isActive: true }
    });
    
    console.log(`\nSearch for "${name}":`);
    if (users.length === 0) {
      console.log('  Not found in database');
    } else {
      users.forEach(u => {
        console.log(`  - ${u.name}`);
        console.log(`    Email: ${u.email}`);
        console.log(`    Role: ${u.role}`);
        console.log(`    Active: ${u.isActive}`);
      });
    }
  }
  
  await db.$disconnect();
})().catch(async (e) => {
  console.error('Error:', e);
  await db.$disconnect();
  process.exit(1);
});
