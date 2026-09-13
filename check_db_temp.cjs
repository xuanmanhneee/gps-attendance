const { PrismaPg } = require('./node_modules/@prisma/adapter-pg');
const { PrismaClient } = require('./node_modules/@prisma/client');

const adapter = new PrismaPg({
  connectionString: 'postgresql://postgres:2552005@localhost:5432/gps_attendance',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS (' + users.length + ') ---');
  for (const u of users) {
    console.log(`ID: ${u.id}, Code: ${u.code}, Role: ${u.role}, Name: ${u.fullname}`);
  }

  const sessions = await prisma.attendanceSession.findMany();
  console.log('\n--- SESSIONS (' + sessions.length + ') ---');
  for (const s of sessions) {
    console.log(`ID: ${s.id}, Title: ${s.title}, Open: ${s.openAt.toISOString()}, Close: ${s.closeAt.toISOString()}, Status: ${s.status}`);
  }

  const records = await prisma.attendanceRecord.findMany();
  console.log('\n--- RECORDS (' + records.length + ') ---');
  for (const r of records) {
    console.log(`SessionID: ${r.sessionId}, UserID: ${r.userId}, Status: ${r.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
