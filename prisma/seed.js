const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    try {
        // ⚡ Nettoyage des tables principales pour un seed propre
        await prisma.transaction.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.userInventory.deleteMany();
        await prisma.userPurchase.deleteMany();
        await prisma.virtualShopItem.deleteMany();
        await prisma.virtualShopCategory.deleteMany();
        await prisma.accountReport.deleteMany();
        await prisma.userDailyActivity.deleteMany();
        await prisma.userStats.deleteMany();
        await prisma.userDailyChallenge.deleteMany();
        await prisma.dailyChallenge.deleteMany();
        await prisma.userBadge.deleteMany();
        await prisma.badge.deleteMany();
        await prisma.xpLevel.deleteMany();
        await prisma.userCertificate.deleteMany();
        await prisma.certificate.deleteMany();
        await prisma.userExerciseAttempt.deleteMany();
        await prisma.exercise.deleteMany();
        await prisma.userLessonProgress.deleteMany();
        await prisma.lesson.deleteMany();
        await prisma.userCourseProgress.deleteMany();
        await prisma.course.deleteMany();
        await prisma.userTrackProgress.deleteMany();
        await prisma.track.deleteMany();
        await prisma.userLevelProgress.deleteMany();
        await prisma.level.deleteMany();
        await prisma.userLanguageProgress.deleteMany();
        await prisma.language.deleteMany();
        await prisma.gameSession.deleteMany();
        await prisma.educationalGame.deleteMany();

        // 🔹 Nettoyage des utilisateurs et profils pour créer l'admin
        await prisma.profile.deleteMany();
        await prisma.user.deleteMany();

        // 🔹 Hasher le mot de passe
        const hashedPassword = await bcrypt.hash('password123', 12);

        // 🔹 Créer l'admin
        const admin = await prisma.user.create({
            data: {
                email: 'admin@lingualearn.com',
                username: 'admin',
                passwordHash: hashedPassword,
                accountType: 'admin',       // obligatoire
                isVerified: true,
                isActive: true,
                profile: {
                    create: {
                        firstName: 'Admin',
                        lastName: 'LinguaLearn',
                        displayName: 'Administrator',
                        isLearningProfile: false
                    }
                }
            }
        });

        console.log('✅ Admin créé:', admin.email);
        console.log('✅ Base de données seedée avec succès!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
