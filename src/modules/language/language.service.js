// Récupérer toutes les langues liées à un utilisateur (via userLanguageProgress)
exports.getLanguagesByUserId = async (userId) => {
       return await prisma.userLanguageProgress.findMany({
	       where: { userId },
	       include: { language: true }
       });
};

// Progression utilisateur pour Language
exports.selectLanguageForUser = async (userId, languageId) => {
       let progress = await prisma.userLanguageProgress.findUnique({ where: { userId_languageId: { userId, languageId } } });
       if (!progress) {
	       progress = await prisma.userLanguageProgress.create({ data: { userId, languageId, status: 'not_started' } });
       }
       return progress;
};

exports.startLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { status: 'started', startedAt: new Date() }
       });
};

exports.completeLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { status: 'completed', completedAt: new Date() }
       });
};
const { prisma } = require('../../config/prisma');

exports.create = async (data) => {
	// Calcul automatique de l'index si non fourni
	let index = data.index;
	if (typeof index !== 'number' || isNaN(index)) {
		const max = await prisma.language.aggregate({ _max: { index: true } });
		index = (max._max.index ?? 0) + 1;
	}

	// Vérifier unicité de l'index
	const existingIndex = await prisma.language.findFirst({ where: { index } });
	if (existingIndex) {
		throw new Error('Une langue avec ce même index existe déjà.');
	}

	// Vérifier unicité du code
	if (data.code) {
		const existingCode = await prisma.language.findUnique({ where: { code: data.code } });
		if (existingCode) {
			throw new Error('Une langue avec ce code existe déjà.');
		}
	}

	return await prisma.language.create({ data: { ...data, index } });
};

exports.getAll = async (includeInactive = false) => {
	const where = includeInactive ? {} : { isActive: true };
	return await prisma.language.findMany({
		where,
		orderBy: { index: 'asc' },
		include: {
			levels: {
				where: { isActive: true },
				orderBy: { index: 'asc' }
			}
		}
	});
};

exports.getById = async (id) => {
	return await prisma.language.findUnique({ where: { id } });
};

exports.getLanguageLevels = async (languageId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Récupérer tous les niveaux de la langue avec leurs modules
	const levels = await prisma.level.findMany({
		where: { languageId: language.id },
		orderBy: { index: 'asc' },
		include: {
			modules: {
				orderBy: { index: 'asc' },
				include: {
					paths: {
						orderBy: { index: 'asc' },
						include: {
							steps: {
								orderBy: { index: 'asc' }
							}
						}
					}
				}
			}
		}
	});

	return levels;
};

exports.getLevelModules = async (languageId, levelId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Récupérer tous les modules du niveau avec leurs parcours et étapes
	const modules = await prisma.module.findMany({
		where: { levelId: level.id },
		orderBy: { index: 'asc' },
		include: {
			paths: {
				orderBy: { index: 'asc' },
				include: {
					steps: {
						orderBy: { index: 'asc' }
					}
				}
			}
		}
	});

	return {
		levelName: level.name,
		modules: modules
	};
};

exports.getModulePaths = async (languageId, levelId, moduleId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Vérifier si le module existe pour ce niveau
	const module = await prisma.module.findFirst({
		where: { 
			id: moduleId,
			levelId: level.id 
		}
	});

	if (!module) {
		return null;
	}

	// Récupérer tous les parcours du module avec leurs étapes
	const paths = await prisma.path.findMany({
		where: { moduleId: module.id },
		orderBy: { index: 'asc' },
		include: {
			steps: {
				orderBy: { index: 'asc' }
			}
		}
	});

	return {
		moduleName: module.name,
		paths: paths
	};
};

exports.getPathSteps = async (languageId, levelId, moduleId, pathId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Vérifier si le module existe pour ce niveau
	const module = await prisma.module.findFirst({
		where: { 
			id: moduleId,
			levelId: level.id 
		}
	});

	if (!module) {
		return null;
	}

	// Vérifier si le parcours existe pour ce module
	const path = await prisma.path.findFirst({
		where: { 
			id: pathId,
			moduleId: module.id 
		}
	});

	if (!path) {
		return null;
	}

	// Récupérer toutes les étapes du parcours
	const steps = await prisma.step.findMany({
		where: { pathId: path.id },
		orderBy: { index: 'asc' }
	});

	return {
		pathName: path.name,
		steps: steps
	};
};

exports.getStepContent = async (languageId, levelId, moduleId, pathId, stepId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Vérifier si le module existe pour ce niveau
	const module = await prisma.module.findFirst({
		where: { 
			id: moduleId,
			levelId: level.id 
		}
	});

	if (!module) {
		return null;
	}

	// Vérifier si le parcours existe pour ce module
	const path = await prisma.path.findFirst({
		where: { 
			id: pathId,
			moduleId: module.id 
		}
	});

	if (!path) {
		return null;
	}

	// Vérifier si l'étape existe pour ce parcours
	const step = await prisma.step.findFirst({
		where: { 
			id: stepId,
			pathId: path.id 
		}
	});

	if (!step) {
		return null;
	}

	// Récupérer tous les cours liés à cette étape
	const courses = await prisma.course.findMany({
		where: { stepId: step.id },
		orderBy: { order: 'asc' }
	});

	// Récupérer tous les exercices liés à cette étape
	const exercises = await prisma.exercise.findMany({
		where: { stepId: step.id },
		orderBy: { order: 'asc' }
	});

	// Récupérer tous les quiz liés à cette étape
	const quizzes = await prisma.stepQuiz.findMany({
		where: { stepId: step.id },
		orderBy: { order: 'asc' },
		include: {
			questions: {
				orderBy: { order: 'asc' }
			}
		}
	});

	return {
		stepName: step.name,
		step: step,
		courses: courses,
		exercises: exercises,
		quizzes: quizzes
	};
};

exports.update = async (id, data) => {
	return await prisma.language.update({ where: { id }, data });
};

exports.remove = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) return null;
	await prisma.language.delete({ where: { id } });
	return true;
};

// Activer une langue
exports.activateLanguage = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) {
		throw new Error('Langue introuvable');
	}
	return await prisma.language.update({
		where: { id },
		data: { isActive: true }
	});
};

// Désactiver une langue
exports.deactivateLanguage = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) {
		throw new Error('Langue introuvable');
	}
	return await prisma.language.update({
		where: { id },
		data: { isActive: false }
	});
};

// Récupérer toutes les langues actives
exports.getActiveLanguages = async () => {
	return await prisma.language.findMany({
		where: { isActive: true },
		orderBy: { index: 'asc' },
		include: {
			levels: {
				where: { isActive: true },
				orderBy: { index: 'asc' }
			}
		}
	});
};

// Récupérer les niveaux disponibles pour une langue
exports.getAvailableLevels = async (languageId) => {
	const language = await prisma.language.findUnique({ 
		where: { id: languageId },
		include: {
			levels: {
				where: { isActive: true },
				orderBy: { index: 'asc' },
				select: {
					id: true,
					code: true,
					name: true,
					description: true,
					index: true,
					isActive: true,
					_count: {
						select: {
							modules: true
						}
					}
				}
			}
		}
	});
	
	if (!language) {
		throw new Error('Langue introuvable');
	}
	
	return {
		language: {
			id: language.id,
			code: language.code,
			name: language.name,
			isActive: language.isActive
		},
		levels: language.levels
	};
};

// Sélectionner une langue avec un niveau de départ et initialiser la progression
exports.startLanguageWithLevel = async (userId, languageId, levelId) => {
	// Vérifier que la langue existe et est active
	const language = await prisma.language.findUnique({
		where: { id: languageId, isActive: true }
	});
	
	if (!language) {
		throw new Error('Langue introuvable ou inactive');
	}
	
	// Vérifier que le niveau existe et appartient à cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: languageId,
			isActive: true
		},
		include: {
			modules: {
				where: { isActive: true },
				orderBy: { index: 'asc' },
				take: 1,
				include: {
					paths: {
						where: { isActive: true },
						orderBy: { index: 'asc' },
						take: 1,
						include: {
							steps: {
								where: { isActive: true },
								orderBy: { index: 'asc' },
								take: 1
							}
						}
					}
				}
			}
		}
	});
	
	if (!level) {
		throw new Error('Niveau introuvable ou inactif pour cette langue');
	}
	
	// Créer ou mettre à jour la progression de langue
	let languageProgress = await prisma.userLanguageProgress.findUnique({
		where: { userId_languageId: { userId, languageId } }
	});
	
	const now = new Date();
	
	if (!languageProgress) {
		languageProgress = await prisma.userLanguageProgress.create({
			data: {
				userId,
				languageId,
				status: 'started',
				startedAt: now,
				lastAccessedAt: now
			}
		});
	} else {
		languageProgress = await prisma.userLanguageProgress.update({
			where: { id: languageProgress.id },
			data: {
				status: 'started',
				startedAt: languageProgress.startedAt || now,
				lastAccessedAt: now
			}
		});
	}
	
	// Créer la progression du niveau choisi
	let levelProgress = await prisma.userLevelProgress.findUnique({
		where: { userId_levelId: { userId, levelId } }
	});
	
	if (!levelProgress) {
		levelProgress = await prisma.userLevelProgress.create({
			data: {
				userId,
				levelId,
				status: 'unlocked',
				unlockedAt: now,
				lastAccessedAt: now
			}
		});
	}
	
	// Débloquer UNIQUEMENT la première séquence (module 1, parcours 1, étape 1)
	const firstModule = level.modules[0];
	if (firstModule) {
		// Débloquer le premier module
		await prisma.userModuleProgress.upsert({
			where: { userId_moduleId: { userId, moduleId: firstModule.id } },
			update: {
				status: 'unlocked',
				unlockedAt: now,
				lastAccessedAt: now
			},
			create: {
				userId,
				moduleId: firstModule.id,
				status: 'unlocked',
				unlockedAt: now,
				lastAccessedAt: now
			}
		});
		
		// Débloquer le premier parcours du module
		const firstPath = firstModule.paths[0];
		if (firstPath) {
			await prisma.userPathProgress.upsert({
				where: { userId_pathId: { userId, pathId: firstPath.id } },
				update: {
					status: 'unlocked',
					unlockedAt: now,
					lastAccessedAt: now
				},
				create: {
					userId,
					pathId: firstPath.id,
					status: 'unlocked',
					unlockedAt: now,
					lastAccessedAt: now
				}
			});
			
			// Débloquer la première étape du parcours
			const firstStep = firstPath.steps[0];
			if (firstStep) {
				await prisma.userStepProgress.upsert({
					where: { userId_stepId: { userId, stepId: firstStep.id } },
					update: {
						status: 'unlocked',
						unlockedAt: now
					},
					create: {
						userId,
						stepId: firstStep.id,
						status: 'unlocked',
						unlockedAt: now
					}
				});
			}
		}
	}
	
	return {
		languageProgress,
		levelProgress,
		level: {
			id: level.id,
			code: level.code,
			name: level.name,
			index: level.index
		},
		language: {
			id: language.id,
			code: language.code,
			name: language.name
		},
		message: 'Langue et niveau initialisés. Première séquence débloquée (Module 1 > Parcours 1 > Étape 1)'
	};
};
