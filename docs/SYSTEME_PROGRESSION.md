# Système de Progression et Déblocage Automatique

## Overview

Ce système implémente une gestion cohérente de la progression des utilisateurs à travers les niveaux, modules, parcours et étapes avec un déblocage automatique basé sur les index ordonnés.

## Architecture

### Structure de Données

```
Language (Langue)
├── Level (Niveau - index: 0, 1, 2...)
│   ├── Module (index: 0, 1, 2...)
│   │   ├── Path (Parcours - index: 0, 1, 2...)
│   │   │   ├── Step (Étape - index: 0, 1, 2...)
│   │   │   │   ├── Lesson
│   │   │   │   ├── Exercise
│   │   │   │   └── Quiz
│   │   │   └── PathQuiz
│   │   └── ...
│   └── ...
└── ...
```

### États de Progression

- **locked**: Non accessible (par défaut)
- **unlocked**: Accessible mais pas commencé
- **started**: En cours
- **completed**: Terminé

## Services Principaux

### 1. ProgressionUnlockService

Service principal qui gère le déblocage automatique:

```javascript
// Initialiser la progression pour un utilisateur
await progressionService.initializeUserLanguageProgress(userId, languageId);

// Compléter une étape et débloquer la suivante
await progressionService.completeStepAndUnlockNext(userId, stepId);

// Compléter un module et débloquer le suivant
await progressionService.completeModuleAndUnlockNext(userId, moduleId);
```

### 2. ProgressionHelperService

Service utilitaire pour les fonctionnalités avancées:

```javascript
// Récupérer la progression complète
const progression = await progressionHelper.getCompleteUserProgression(userId, languageId);

// Calculer les statistiques
const stats = await progressionHelper.calculateProgressionStats(userId, languageId);

// Récupérer les prochains éléments à compléter
const nextElements = await progressionHelper.getNextElements(userId, languageId);
```

## API Endpoints

### Progression de Base

```
POST /api/v1/progression/initialize
POST /api/v1/progression/complete/step
POST /api/v1/progression/complete/path
POST /api/v1/progression/complete/module
POST /api/v1/progression/complete/level
```

### Fonctionnalités Avancées

```
GET  /api/v1/progression/user/:userId/language/:languageId
GET  /api/v1/progression/complete/:userId/:languageId
GET  /api/v1/progression/stats/:userId/:languageId
GET  /api/v1/progression/next/:userId/:languageId
GET  /api/v1/progression/check/:userId/:elementType/:elementId
POST /api/v1/progression/unlock
POST /api/v1/progression/recalculate/:userId/:languageId
```

## Middleware

### checkProgressionAccess

Vérifie l'accès à un élément et initialise la progression si nécessaire:

```javascript
router.get('/levels/:levelId', 
  checkProgressionAccess('level'),
  requireUnlockedAccess,
  controller.getLevel
);
```

### requireUnlockedAccess

Assure que l'élément est débloqué.

### requireStartableAccess

Vérifie que l'élément peut être démarré (unlocked ou started).

## Logique de Déblocage

### Règles Automatiques

1. **Initialisation**: Quand un utilisateur commence une langue, le premier niveau est débloqué
2. **Déblocage en chaîne**: La complétion d'un élément débloque automatiquement le suivant dans l'ordre des index
3. **Validation**: Seuls les éléments avec le bon ordre d'index sont débloqués

### Exemple de Flux

1. Utilisateur commence la langue Française
   → Level 0 (Débutant) débloqué
   → Module 0 débloqué
   → Path 0 débloqué
   → Step 0 débloqué

2. Utilisateur complète Step 0
   → Step 0 marqué comme "completed"
   → Step 1 débloqué automatiquement

3. Utilisateur complète toutes les étapes du Path 0
   → Path 0 marqué comme "completed"
   → Path 1 débloqué automatiquement

## Intégration avec Services Existants

Les services existants ont été enrichis avec des méthodes `*WithAutoUnlock`:

```javascript
// Ancienne méthode (toujours disponible)
await stepService.completeStepForUser(userId, stepId);

// Nouvelle méthode avec déblocage automatique
await stepService.completeStepWithAutoUnlock(userId, stepId);
```

## Validation et Cohérence

### Index Uniques

- Chaque élément a un index unique dans son parent
- L'ordre des index détermine la séquence de déblocage

### Contraintes de Base de Données

```sql
-- Unicité des index par parent
UNIQUE(languageId, index) pour levels
UNIQUE(levelId, index) pour modules
UNIQUE(moduleId, index) pour paths
UNIQUE(pathId, index) pour steps
```

## Cas d'Usage

### 1. Frontend - Affichage de la Progression

```javascript
// Récupérer la progression complète
const response = await fetch('/api/v1/progression/complete/userId/languageId');
const progression = await response.json();

// Afficher les éléments débloqués/complétés
progression.data.levels.forEach(level => {
  const isUnlocked = level.userProgress?.status !== 'locked';
  const isCompleted = level.userProgress?.status === 'completed';
  // ...
});
```

### 2. Backend - Validation d'Accès

```javascript
// Middleware protégé
router.get('/steps/:stepId/content', 
  checkProgressionAccess('step'),
  requireUnlockedAccess,
  getStepContent
);
```

### 3. Admin - Déblocage Manuel

```javascript
// Débloquer manuellement un élément
await fetch('/api/v1/progression/unlock', {
  method: 'POST',
  body: {
    userId: 'user123',
    elementType: 'level',
    elementId: 'level456'
  }
});
```

## Performance

### Optimisations

1. **Indexation**: Utilisation des index de base de données sur les champs de progression
2. **Chargement paresseux**: Les données hiérarchiques sont chargées uniquement quand nécessaire
3. **Mise en cache**: Les statistiques peuvent être mises en cache côté utilisateur

### Recommandations

- Utiliser les endpoints de progression complète pour les pages d'aperçu
- Utiliser les endpoints individuels pour les mises à jour en temps réel
- Recalculer les pourcentages uniquement lors des changements majeurs

## Sécurité

### Contrôles

- Validation des userId et elementId
- Vérification des permissions d'accès
- Protection contre les manipulations d'index

### Bonnes Pratiques

- Toujours utiliser les middleware pour valider l'accès
- Implémenter des logs pour les actions de déblocage
- Surveiller les tentatives d'accès non autorisées

## Maintenance

### Recalcul de Progression

```javascript
// Recalculer tous les pourcentages pour un utilisateur
await fetch('/api/v1/progression/recalculate/userId/languageId', {
  method: 'POST'
});
```

### Nettoyage

- Supprimer les progressions orphelines
- Vérifier la cohérence des index
- Auditer les déblocages manuels

## Conclusion

Ce système fournit une base robuste et évolutive pour la gestion de la progression utilisateur avec un déblocage automatique cohérent basé sur l'ordre structurel du contenu.
