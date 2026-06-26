const http = require('http');
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
  // Get API response
  return new Promise(resolve => {
    http.get('http://localhost:3000/api/tickets/technicians', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const apiTechs = JSON.parse(data);
          
          console.log(`API returned ${apiTechs.length} technicians\n`);

          // Get database data
          const dbUsers = await db.user.findMany({
            where: { isActive: true },
            select: { name: true, email: true }
          });

          console.log(`Database has ${dbUsers.length} active users\n`);

          // Check which DB users are NOT in the API response
          console.log('Checking for missing users:\n');
          const apiNamesNorm = new Set(apiTechs.map(t => normalizeIdentity(t.name)));
          
          let missing = 0;
          dbUsers.forEach(dbUser => {
            const normalized = normalizeIdentity(dbUser.name);
            if (!apiNamesNorm.has(normalized)) {
              console.log(`✗ MISSING: ${dbUser.name} (${dbUser.email})`);
              console.log(`  Normalized: "${normalized}"`);
              missing++;
            }
          });

          if (missing === 0) {
            console.log('✓ No missing users!');
          } else {
            console.log(`\nTotal missing: ${missing}`);
          }

          await db.$disconnect();
          resolve();
        } catch (e) {
          console.error('Error parsing API response:', e);
          await db.$disconnect();
          resolve();
        }
      });
    }).on('error', async (e) => {
      console.error('HTTP Error:', e);
      await db.$disconnect();
      resolve();
    });
  });
})();
