# 🎮 SYSTÈME DE GAMIFICATION - LINGUALEARN

## 📋 Vue d'ensemble

Le système de gamification de LinguaLearn est un système complet qui récompense et motive les utilisateurs à travers :
- **XP (Points d'expérience)** et **Niveaux**
- **Coins (Pièces)** pour débloquer du contenu premium
- **Badges** pour les accomplissements
- **Streaks** pour encourager la régularité
- **Leaderboard** pour la compétition amicale

---

## 🎯 Composants du système

### 1. **XP et Niveaux**

#### Calcul du niveau
```javascript
level = floor(sqrt(totalXp / 100)) + 1
```

#### XP requis par niveau
| Niveau | XP Total Requis | XP pour ce niveau |
|--------|-----------------|-------------------|
| 1 | 0 | 0 |
| 2 | 100 | 100 |
| 3 | 400 | 300 |
| 4 | 900 | 500 |
| 5 | 1600 | 700 |
| 10 | 8100 | - |
| 20 | 36100 | - |

#### Attribution d'XP
| Action | XP Gagné | Conditions |
|--------|----------|------------|
| Compléter une Lesson | 10 | Automatique |
| Réussir un Exercise | 20 | Score ≥ 70% |
| Exercise partiel | 0-20 | Proportionnel au score |
| Réussir un Quiz | 30-50 | Score ≥ passingScore |
| Quiz partiel | 0-50 | Proportionnel au score |
| Streak quotidien | +5 | Par jour consécutif |

---

### 2. **Coins**

#### Attribution de Coins
| Action | Coins Gagnés | Conditions |
|--------|--------------|------------|
| Compléter une Lesson | 5 | Automatique |
| Réussir un Exercise | 10 | Score ≥ 70% |
| Exercise partiel | 0-10 | Proportionnel au score |
| Réussir un Quiz | 15-25 | Score ≥ passingScore |
| Quiz partiel | 0-25 | Proportionnel au score |
| Streak quotidien | +2 | Par jour consécutif |

#### Utilisation des Coins
- Débloquer du contenu premium
- Acheter des indices
- Personnaliser le profil
- Accéder à des leçons bonus

---

### 3. **Badges**

#### Badges disponibles

| Badge | ID | Icon | Condition |
|-------|-----|------|-----------|
| **Premier Pas** | `first_lesson` | 🎓 | Compléter 1 leçon |
| **Étudiant Assidu** | `lessons_10` | 📚 | Compléter 10 leçons |
| **Pratiquant** | `exercises_10` | ✍️ | Réussir 10 exercices |
| **Semaine Parfaite** | `streak_7` | 🔥 | 7 jours consécutifs |
| **Champion de la Régularité** | `streak_30` | ⚡ | 30 jours consécutifs |
| **Niveau 5** | `level_5` | ⭐ | Atteindre le niveau 5 |
| **Niveau 10** | `level_10` | 🌟 | Atteindre le niveau 10 |
| **Millionnaire** | `coins_1000` | 💎 | Collecter 1000 coins |

#### Attribution automatique
Les badges sont vérifiés et attribués automatiquement :
- Après chaque ajout de récompenses
- Après complétion d'une lesson/exercise
- Après mise à jour du streak

---

### 4. **Streaks (Séries)**

#### Fonctionnement
- **Nouveau streak** : Commence à 1 le premier jour d'activité
- **Streak maintenu** : +1 si activité le jour suivant
- **Streak cassé** : Retour à 1 si pas d'activité pendant >1 jour
- **Bonus** : +5 XP et +2 coins par jour de streak maintenu

#### Exemple
```
Jour 1: Activité → Streak = 1
Jour 2: Activité → Streak = 2 (+5 XP, +2 coins)
Jour 3: Activité → Streak = 3 (+5 XP, +2 coins)
Jour 4: Pas d'activité
Jour 5: Activité → Streak = 1 (cassé)
```

---

### 5. **Leaderboard (Classement)**

#### Critères de classement
- **Classement par XP total** (principal)
- Top 10, 50, 100 utilisateurs
- Mise à jour en temps réel

#### Informations affichées
- Rang
- Nom d'utilisateur
- Photo de profil
- Niveau
- XP total
- Coins total
- Streak actuel

---

## 🔌 API Endpoints

### **Stats**

#### `GET /api/v1/gamification/users/:userId/stats`
Récupère les statistiques complètes d'un utilisateur.

**Réponse:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "level": 5,
    "totalXp": 1650,
    "xpForNextLevel": 2500,
    "xpProgress": 250,
    "xpNeeded": 900,
    "progressPercentage": 28,
    "totalCoins": 425,
    "currentStreak": 12,
    "longestStreak": 15,
    "totalLessonsCompleted": 45,
    "totalExercisesCompleted": 38,
    "totalStepsCompleted": 83,
    "accuracyRate": 85.5,
    "badges": [
      {
        "id": "first_lesson",
        "name": "Premier Pas",
        "description": "Complétez votre première leçon",
        "icon": "🎓",
        "earnedAt": "2026-04-01T10:00:00.000Z"
      }
    ],
    "totalBadges": 5
  }
}
```

#### `POST /api/v1/gamification/users/:userId/rewards`
Ajoute des récompenses (XP et coins) à un utilisateur.

**Body:**
```json
{
  "xp": 20,
  "coins": 10
}
```

---

### **Badges**

#### `GET /api/v1/gamification/badges`
Récupère tous les badges disponibles.

#### `GET /api/v1/gamification/users/:userId/badges`
Récupère les badges d'un utilisateur.

#### `POST /api/v1/gamification/users/:userId/badges/check`
Vérifie et attribue automatiquement les nouveaux badges.

---

### **Streaks**

#### `POST /api/v1/gamification/users/:userId/streak`
Met à jour le streak quotidien de l'utilisateur.

**Réponse:**
```json
{
  "success": true,
  "data": {
    "currentStreak": 13,
    "streakBonus": 5
  },
  "message": "Streak maintenu ! Bonus: 5 XP"
}
```

---

### **Leaderboard**

#### `GET /api/v1/gamification/leaderboard?limit=10`
Récupère le classement global.

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "user456",
      "username": "JohnDoe",
      "profilePicture": "https://...",
      "level": 12,
      "totalXp": 14500,
      "totalCoins": 3200,
      "currentStreak": 45
    }
  ]
}
```

#### `GET /api/v1/gamification/users/:userId/rank`
Récupère le rang d'un utilisateur.

---

## 💻 Intégration dans le code

### **Dans course.service.js (Lessons)**
```javascript
const gamificationService = require('../gamification/gamification.service');

exports.completeLessonForUser = async (lessonId, userId) => {
  // ... logique de complétion ...
  
  // Ajouter les récompenses
  await gamificationService.addRewards(userId, 10, 5);
  await gamificationService.incrementLessonsCompleted(userId);
  await gamificationService.updateDailyStreak(userId);
  
  return result;
};
```

### **Dans exercise.service.js (Exercises)**
```javascript
const gamificationService = require('../gamification/gamification.service');

exports.submitExerciseAnswer = async (exerciseId, userId, userAnswers) => {
  // ... validation et scoring ...
  
  if (passed) {
    await gamificationService.addRewards(userId, earnedXp, earnedCoins);
    await gamificationService.incrementExercisesCompleted(userId);
    await gamificationService.updateDailyStreak(userId);
  }
  
  return result;
};
```

### **Dans step-quizzes.service.js (Quiz)**
```javascript
const gamificationService = require('../gamification/gamification.service');

exports.submitQuizAnswer = async (quizId, userId, userAnswers) => {
  // ... validation et scoring ...
  
  if (passed) {
    await gamificationService.addRewards(userId, earnedXp, earnedCoins);
    await gamificationService.updateDailyStreak(userId);
  }
  
  return result;
};
```

---

## 📊 Modèles de données

### **UserStats**
```prisma
model UserStats {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  totalXp                 BigInt   @default(0)
  totalCoins              Int      @default(0)
  currentStreak           Int      @default(0)
  longestStreak           Int      @default(0)
  totalStudyMinutes       Int      @default(0)
  totalExercisesCompleted Int      @default(0)
  totalLessonsCompleted   Int      @default(0)
  totalStepsCompleted     Int      @default(0)
  accuracyRate            Decimal? @db.Decimal(5, 2)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  user                    User     @relation(fields: [userId], references: [id])
}
```

### **UserDailyActivity**
```prisma
model UserDailyActivity {
  id                 String    @id @default(cuid())
  userId             String
  activityDate       DateTime
  studyMinutes       Int       @default(0)
  lessonsCompleted   Int       @default(0)
  exercisesCompleted Int       @default(0)
  xpEarned           Int       @default(0)
  coinsEarned        Int       @default(0)
  firstActivityAt    DateTime?
  lastActivityAt     DateTime?
  createdAt          DateTime  @default(now())
  user               User      @relation(fields: [userId], references: [id])
  
  @@unique([userId, activityDate])
}
```

### **Badge & UserBadge**
```prisma
model Badge {
  id          String      @id @default(cuid())
  badgeKey    String      @unique
  name        String
  description String
  icon        String
  createdAt   DateTime    @default(now())
  userBadges  UserBadge[]
}

model UserBadge {
  id       String   @id @default(cuid())
  userId   String
  badgeId  String
  earnedAt DateTime @default(now())
  user     User     @relation(fields: [userId], references: [id])
  badge    Badge    @relation(fields: [badgeId], references: [id])
  
  @@unique([userId, badgeId])
}
```

---

## ✅ Checklist d'implémentation

- [x] Service de gamification complet
- [x] Gestion des XP et niveaux
- [x] Gestion des coins
- [x] Système de badges automatique
- [x] Système de streaks quotidiens
- [x] Leaderboard et classement
- [x] Contrôleur avec tous les endpoints
- [x] Routes avec documentation Swagger
- [ ] Intégration dans les services existants (course, exercise, quiz)
- [ ] Tests unitaires
- [ ] Tests d'intégration

---

## 🚀 Prochaines étapes

1. **Intégrer le service de gamification** dans les services existants :
   - `course.service.js` pour les lessons
   - `exercise.service.js` pour les exercices
   - `step-quizzes.service.js` pour les quiz

2. **Ajouter des badges supplémentaires** :
   - Badges par langue (Maître du Mooré, Expert du Dioula...)
   - Badges de vitesse (Éclair, Flash...)
   - Badges sociaux (Mentor, Ambassadeur...)

3. **Améliorer le leaderboard** :
   - Classement par langue
   - Classement hebdomadaire/mensuel
   - Classement entre amis

4. **Ajouter des récompenses visuelles** :
   - Animations de niveau up
   - Notifications de badges
   - Effets visuels pour les streaks

---

## 📝 Notes importantes

- Les badges sont vérifiés **automatiquement** après chaque action
- Les streaks sont calculés en **temps UTC** (à adapter selon le fuseau horaire)
- Le leaderboard est mis à jour en **temps réel**
- Les récompenses sont **cumulatives** (pas de limite)
- Le système est **optimisé** avec des requêtes Prisma efficaces

---

**Documentation créée le:** 2026-04-07  
**Version:** 1.0.0  
**Auteur:** LinguaLearn Team
