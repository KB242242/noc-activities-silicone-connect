const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function main() {
  const updates = [
    { email: 'beni.mendouga@siliconeconnect.com', name: 'Béni Mendouga' },
    { email: 'jose.ngonkoli@siliconeconnect.com', name: 'José NGONKOLI' },
    { email: 'sephora.ekaba@siliconeconnect.com', name: 'Séphora EKABA' },
    { email: 'severin.ndandou@siliconeconnect.com', name: 'Séverin Ndandou' },
  ];

  for (const item of updates) {
    const result = await db.user.updateMany({
      where: { email: item.email },
      data: { name: item.name },
    });
    console.log(`${item.email} -> ${item.name} (updated: ${result.count})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
