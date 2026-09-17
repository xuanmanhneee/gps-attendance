import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "#prisma/generated/client";

import { seedUsers } from "./seed/users.seed";
import { seedAccounts } from "./seed/accounts.seed";
import { seedTags } from "./seed/tags.seed";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"],
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const users = await seedUsers(prisma);

  await seedAccounts(prisma, users);

  await seedTags(prisma, users);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
