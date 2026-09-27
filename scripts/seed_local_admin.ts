import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';
import { Role, AccountStatus, CreatedFrom } from '@prisma/client';

async function seedAdmin() {
  const email = 'admin@onwear.com';
  const hashedPassword = await hashPassword('Admin123');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: Role.admin,
        accountStatus: AccountStatus.ACTIVE
      }
    });
    console.log('Admin user updated in local DB successfully!');
  } else {
    await prisma.user.create({
      data: {
        name: 'OnWear Admin',
        email,
        password: hashedPassword,
        phone: '01711111111',
        address: 'Dhaka, Bangladesh',
        role: Role.admin,
        accountStatus: AccountStatus.ACTIVE,
        createdFrom: CreatedFrom.DIRECT_REGISTRATION,
        emailVerified: true
      }
    });
    console.log('Admin user created in local DB successfully!');
  }
}

seedAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
