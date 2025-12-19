const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');
    
    // Nettoyer la base de données
    await prisma.session.deleteMany();
    await prisma.loginAttempt.deleteMany();
    await prisma.verificationCode.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Créer l'admin
    const admin = await prisma.user.create({
        data: {
            email: 'admin@wise.com',
            username: 'admin',
            passwordHash: hashedPassword,
            userType: 'admin',
            isVerified: true,
            status: 'active'
        }
    });
    
    // Créer un parent
    const parent = await prisma.user.create({
        data: {
            email: 'parent@wise.com',
            phone: '+1234567890',
            username: 'parent1',
            passwordHash: hashedPassword,
            userType: 'parent',
            isVerified: true,
            status: 'active'
        }
    });
    
    // Créer un enfant
    const child = await prisma.user.create({
        data: {
            email: 'child@sonaby.com',
            username: 'child1',
            passwordHash: hashedPassword,
            userType: 'child',
            parentId: parent.id,
            isVerified: true,
            status: 'active'
        }
    });
    
    
    
    console.log('✅ Database seeded successfully!');
    console.log('👑 Admin user:', admin.email);
    console.log('👨‍👩‍👧‍👦 Parent user:', parent.email);
    console.log('👶 Child user:', child.email);
    console.log('👩‍🏫 Teacher user:', teacher.email);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
