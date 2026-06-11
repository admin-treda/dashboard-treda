import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('Test1234!', 12)
  const user = await prisma.user.upsert({
    where: { username: 'tester' },
    update: {},
    create: {
      username: 'tester',
      name: 'Test User',
      email: 'tester@treda.com',
      password: hash,
      role: 'admin',
    }
  })
  console.log('✅ User created:', user.username, '| role:', user.role, '| password: Test1234!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
