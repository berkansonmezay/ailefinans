const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.merchant.findMany();
  console.log("MERCHANTS:", m);
}
main().catch(console.error);
