const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

function normalizeIdentity(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  const allActiveUsers = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' }
  });

  console.log(`Total active users: ${allActiveUsers.length}\n`);

  const testNames = ['Béni Mendouga', 'José NGONKOLI', 'Séverin Ndandou'];
  
  for (const testName of testNames) {
    const normalized = normalizeIdentity(testName);
    console.log(`\nTesting: "${testName}" → normalized: "${normalized}"`);
    
    const matches = allActiveUsers.filter(u => {
      const uNorm = normalizeIdentity(u.name);
      return uNorm === normalized;
    });
    
    console.log(`  Found ${matches.length} user(s) with matching normalized name:`);
    matches.forEach(m => {
      console.log(`    - ${m.name} (${m.email}) [${m.role}]`);
    });
  }

  // Check for all users with these normalized names
  const dedupMap = new Map();
  allActiveUsers.forEach(u => {
    const normalized = normalizeIdentity(u.name);
    const emailNorm = normalizeIdentity(u.email ?? '');
    const key = emailNorm ? `email:${emailNorm}` : `name:${normalized}`;
    
    if (dedupMap.has(key)) {
      console.log(`\nDEDUP COLLISION on key: ${key}`);
      console.log(`  Existing: ${dedupMap.get(key).name} (${dedupMap.get(key).email})`);
      console.log(`  New: ${u.name} (${u.email})`);
    } else {
      dedupMap.set(key, u);
    }
  });

  console.log(`\n\nFinal dedup map size: ${dedupMap.size}`);

  await db.$disconnect();
})().catch(async (e) => {
  console.error('Error:', e);
  await db.$disconnect();
  process.exit(1);
});
