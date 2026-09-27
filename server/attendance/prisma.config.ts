import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
<<<<<<< HEAD
    seed: 'ts-node prisma/seed.ts',
=======
    seed: "tsx src/prisma/prisma.seed.ts",
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
