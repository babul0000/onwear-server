import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS IN DATABASE ---');
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isDeleted: u.isDeleted
  })), null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
