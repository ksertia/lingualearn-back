// ...existing code...
const swaggerJsdoc = require('swagger-jsdoc');
const { appConfig } = require('./appConfig');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LinguaLearn API',
      version: '1.0.0',
      description: 'API complète pour la plateforme LinguaLearn - Authentication, Users & Admin',
      contact: {
        name: 'API Support',
        email: 'support@lingualearn.com',
      },
    },
    servers: [
      {
        url: 'https://localhost:4000',
        description: 'Développement local (HTTPS)',
      },
      {
        url: 'https://213.32.120.11:4000',
        description: 'Production (VPS)',
      },
      {
        url: 'https://lingualearn-back-second-1.onrender.com',
        description: 'Production (Render.com)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Format: Bearer {token}',
          // Configuration pour la persistance du token
          'x-tokenName': 'Authorization',
          'x-persistAuthorization': true
        },
      },
      schemas: {
        Language: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clq1x2abc0000v2l3k9x9x9x9' },
            code: { type: 'string', example: 'FR' },
            name: { type: 'string', example: 'Français' },
            description: { type: 'string', example: 'Langue française' },
            iconUrl: { type: 'string', example: 'https://cdn.lingualearn.com/icons/fr.png' },
            isActive: { type: 'boolean', example: true },
            index: { type: 'integer', example: 1 }
          }
        },
        ProgressionInit: {
          type: 'object',
          required: ['userId', 'languageId'],
          properties: {
            userId: { type: 'string', example: 'user123' },
            languageId: { type: 'string', example: 'lang456' }
          }
        },
        CompleteStep: {
          type: 'object',
          required: ['userId', 'stepId'],
          properties: {
            userId: { type: 'string', example: 'user123' },
            stepId: { type: 'string', example: 'step789' },
            score: { type: 'number', example: 85 }
          }
        },
        CompletePath: {
          type: 'object',
          required: ['userId', 'pathId'],
          properties: {
            userId: { type: 'string', example: 'user123' },
            pathId: { type: 'string', example: 'path456' },
            quizScore: { type: 'number', example: 90 }
          }
        },
        CompleteModule: {
          type: 'object',
          required: ['userId', 'moduleId'],
          properties: {
            userId: { type: 'string', example: 'user123' },
            moduleId: { type: 'string', example: 'module123' }
          }
        },
        CompleteLevel: {
          type: 'object',
          required: ['userId', 'levelId'],
          properties: {
            userId: { type: 'string', example: 'user123' },
            levelId: { type: 'string', example: 'level456' }
          }
        },
        UnlockElement: {
          type: 'object',
          required: ['userId', 'elementType', 'elementId'],
          properties: {
            userId: { type: 'string', example: 'user123' },
            elementType: { type: 'string', enum: ['level', 'module', 'path', 'step'], example: 'level' },
            elementId: { type: 'string', example: 'level456' }
          }
        },
        UserProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'progress123' },
            status: { type: 'string', enum: ['locked', 'unlocked', 'started', 'completed'], example: 'unlocked' },
            progressPercentage: { type: 'number', example: 65.5 },
            totalXp: { type: 'integer', example: 150 },
            timeSpentMinutes: { type: 'integer', example: 120 },
            unlockedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
            startedAt: { type: 'string', example: '2024-01-15T10:35:00Z' },
            completedAt: { type: 'string', example: null },
            lastAccessedAt: { type: 'string', example: '2024-01-15T14:20:00Z' }
          }
        },
        StepProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'step123' },
            title: { type: 'string', example: 'Alphabet français' },
            description: { type: 'string', example: 'Apprendre les lettres de l\'alphabet' },
            stepType: { type: 'string', enum: ['lesson', 'exercise', 'quiz'], example: 'lesson' },
            estimatedMinutes: { type: 'integer', example: 15 },
            index: { type: 'integer', example: 0 },
            userProgress: { $ref: '#/components/schemas/UserProgress' }
          }
        },
        PathProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'path123' },
            title: { type: 'string', example: 'Introduction au français' },
            description: { type: 'string', example: 'Parcours d\'introduction' },
            difficulty: { type: 'string', example: 'beginner' },
            estimatedHours: { type: 'integer', example: 10 },
            index: { type: 'integer', example: 0 },
            userProgress: { $ref: '#/components/schemas/UserProgress' },
            steps: {
              type: 'array',
              items: { $ref: '#/components/schemas/StepProgress' }
            }
          }
        },
        ModuleProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'module123' },
            title: { type: 'string', example: 'Basics' },
            description: { type: 'string', example: 'Module des bases' },
            iconUrl: { type: 'string', example: 'https://cdn.lingualearn.com/icons/basics.png' },
            index: { type: 'integer', example: 0 },
            userProgress: { $ref: '#/components/schemas/UserProgress' },
            paths: {
              type: 'array',
              items: { $ref: '#/components/schemas/PathProgress' }
            }
          }
        },
        LevelProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'level123' },
            code: { type: 'string', example: 'beginner' },
            name: { type: 'string', example: 'Débutant' },
            description: { type: 'string', example: 'Niveau débutant' },
            index: { type: 'integer', example: 0 },
            userProgress: { $ref: '#/components/schemas/UserProgress' },
            modules: {
              type: 'array',
              items: { $ref: '#/components/schemas/ModuleProgress' }
            }
          }
        },
        CompleteProgression: {
          type: 'object',
          properties: {
            user: { type: 'string', example: 'user123' },
            language: { $ref: '#/components/schemas/Language' },
            overallProgress: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'overall123' },
                status: { type: 'string', example: 'started' },
                overallProgress: { type: 'number', example: 45.5 },
                totalXp: { type: 'integer', example: 500 },
                totalTimeMinutes: { type: 'integer', example: 300 },
                startedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
                completedAt: { type: 'string', example: null },
                lastAccessedAt: { type: 'string', example: '2024-01-15T14:20:00Z' }
              }
            },
            levels: {
              type: 'array',
              items: { $ref: '#/components/schemas/LevelProgress' }
            }
          }
        },
        ProgressionStats: {
          type: 'object',
          properties: {
            totalLevels: { type: 'integer', example: 3 },
            completedLevels: { type: 'integer', example: 1 },
            totalModules: { type: 'integer', example: 12 },
            completedModules: { type: 'integer', example: 4 },
            totalPaths: { type: 'integer', example: 36 },
            completedPaths: { type: 'integer', example: 12 },
            totalSteps: { type: 'integer', example: 180 },
            completedSteps: { type: 'integer', example: 60 },
            overallProgressPercentage: { type: 'number', example: 33.33 },
            totalEstimatedHours: { type: 'number', example: 120 },
            completedEstimatedHours: { type: 'number', example: 40 }
          }
        },
        NextElement: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['step', 'path', 'module', 'level'], example: 'step' },
            element: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'step123' },
                title: { type: 'string', example: 'Alphabet français' },
                description: { type: 'string', example: 'Apprendre les lettres' },
                stepType: { type: 'string', example: 'lesson' },
                estimatedMinutes: { type: 'integer', example: 15 },
                index: { type: 'integer', example: 0 }
              }
            },
            parent: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'path' },
                element: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'path123' },
                    title: { type: 'string', example: 'Introduction' }
                  }
                }
              }
            },
            hierarchy: {
              type: 'object',
              properties: {
                level: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'level123' },
                    name: { type: 'string', example: 'Débutant' }
                  }
                },
                module: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'module123' },
                    title: { type: 'string', example: 'Basics' }
                  }
                }
              }
            },
            userProgress: { $ref: '#/components/schemas/UserProgress' }
          }
        },
        AccessCheck: {
          type: 'object',
          properties: {
            canAccess: { type: 'boolean', example: true },
            reason: { type: 'string', example: null },
            status: { type: 'string', example: 'unlocked' },
            progress: { $ref: '#/components/schemas/UserProgress' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Progression initialisée avec succès' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Utilisateur non trouvé' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Languages',
        description: 'Gestion des langues et de leurs niveaux/modules'
      },
      {
        name: 'Discover',
        description: 'Découverte de l\'application, choix de langue, exercices de découverte, etc.'
      },
      {
        name: 'Progression',
        description: 'Gestion de la progression utilisateur - déblocage automatique, complétion, statistiques'
      },
    //   {
    //     name: 'Authentication',
    //     description: 'Endpoints d\'authentification (inscription, connexion, etc.)',
    //   },
    //   {
    //     name: 'Users',
    //     description: 'Gestion du profil utilisateur',
    //   },
    //   {
    //     name: 'LearningPaths',
    //     description: 'Gestion des parcours (LearningPath)'
    //   },
    //   {
    //     name: 'Levels',
    //     description: 'Gestion des niveaux (Level)'
    //   },
    //   {
    //     name: 'Steps',
    //     description: 'Gestion des étapes (Step)'
    //   },
    //   {
    //     name: 'Exercises',
    //     description: 'Gestion des exercices (Exercise)'
    //   },
    //   {
    //     name: 'StepQuizzes',
    //     description: 'Gestion des quiz d\'étape (StepQuiz)'
    //   },
    //   {
    //     name: 'AdminDashboard',
    //     description: 'Statistiques et état global de la plateforme'
    //   },
    //   {
    //     name: 'SubscriptionPlans',
    //     description: 'Gestion des plans d\'abonnement'
    //   },
    //   {
    //     name: 'Subscriptions',
    //     description: 'Gestion des abonnements clients'
    //   },
    //   {
    //     name: 'MessagesWS',
    //     description: 'Messagerie temps réel (WebSocket)'
    //   },
    //   {
    //     name: 'Notifications',
    //     description: 'Gestion des notifications (REST + WebSocket)'
    //   },
    //   {
    //     name: 'Gamification',
    //     description: 'Gestion des badges et récompenses'
    //   },
    //   {
    //     name: 'Course',
    //     description: 'Gestion des cours (Course)'
    //   },
    //   {
    //     name: 'Levels',
    //     description: 'Gestion des niveaux (Level)'
    //   },
    //   {
    //     name: 'Steps',
    //     description: 'Gestion des étapes (Step)'
    //   },
    //   {
    //     name: 'Exercises',
    //     description: 'Gestion des exercices (Exercise)'
    //   },
    //   {
    //     name: 'StepQuizzes',
    //     description: 'Gestion des quiz d\'étape (StepQuiz)'
    //   },
    //   {
    //     name: 'AdminDashboard',
    //     description: 'Statistiques et état global de la plateforme'
    //   },
    //   {
    //     name: 'SubscriptionPlans',
    //     description: 'Gestion des plans d\'abonnement'
    //   },
    //   {
    //     name: 'Subscriptions',
    //     description: 'Gestion des abonnements clients'
    //   },
    //   {
    //     name: 'MessagesWS',
    //     description: 'Messagerie temps réel (WebSocket)'
    //   },
    //   {
    //     name: 'Notifications',
    //     description: 'Gestion des notifications (REST + WebSocket)'
    //   },
    //   {
    //     name: 'Gamification',
    //     description: 'Gestion des badges et récompenses'
    //   },
    //   {
    //     name: 'Course',
    //     description: 'Gestion des cours (Course)'
    //   },
    ],
  },
  apis: [
    './src/routes/index.js',
    './src/modules/auth/auth.routes.js',
    './src/modules/user/user.routes.js',
    './src/modules/learning_path/learning.path.routes.js',
    './src/modules/Level/Level.routes.js',
    './src/modules/step/step.routes.js',
    './src/modules/exercise/exercise.routes.js',
    './src/modules/step-quizzes/step-quizzes.routes.js',
    './src/modules/admin_dashboard/admin_dashboard.routes.js',
    './src/modules/subscription_plan/subscription_plan.routes.js',
    './src/modules/subscription/subscription.routes.js',
    './src/modules/message_ws/message_ws.routes.js',
    './src/modules/notification/notification.routes.js',
    './src/modules/gamification/gamification.routes.js',
    './src/modules/course/course.routes.js',
    './src/modules/upload/upload.routes.js',
    './src/modules/module/module.routes.js',
    './src/modules/language/language.routes.js',
    './src/modules/evaluation/evaluation.routes.js',
    './src/modules/discover/discover.routes.js',
    './src/modules/progression/progression.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

