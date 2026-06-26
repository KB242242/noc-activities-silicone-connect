const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

function codepoints(str) {
  return Array.from(str).map((c) => c.codePointAt(0).toString(16)).join(' ');
}

async function main() {
  const emails = [
    'beni.mendouga@siliconeconnect.com',
    'jose.ngonkoli@siliconeconnect.com',
    'sephora.ekaba@siliconeconnect.com',
    'severin.ndandou@siliconeconnect.com',
  ];
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, name: true },
    orderBy: { email: 'asc' },
  });

  for (const u of users) {
    console.log(u.email, '=>', u.name);
    console.log('codepoints:', codepoints(u.name));
  }
}

main().finally(async () => db.$disconnect());
