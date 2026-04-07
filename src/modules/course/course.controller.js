const courseService = require('./course.service');
const {
	createCourseSchema,
	updateCourseSchema,
	patchCourseSchema
} = require('./course.schema');

// Progression endpoints
const getCoursesByUserId = async (req, res, next) => {
	try {
		const courses = await courseService.getCoursesByUserId(req.params.userId);
		if (!courses || courses.length === 0) {
			return res.status(404).json({ success: false, error: 'Aucun cours trouvé pour cet utilisateur' });
		}
		res.json({ success: true, data: courses });
	} catch (error) {
		next(error);
	}
};

const startCourse = async (req, res, next) => {
	try {
		const { userId, courseId } = req.params;
		const progress = await courseService.startCourseForUser(userId, courseId);
		res.json({ success: true, data: progress });
	} catch (error) {
		next(error);
	}
};

const completeCourse = async (req, res, next) => {
	try {
		const { userId, courseId } = req.params;
		const progress = await courseService.completeCourseForUser(userId, courseId);
		res.json({ success: true, data: progress });
	} catch (error) {
		next(error);
	}
};

// Compléter une leçon (Lesson) pour un utilisateur
const completeLesson = async (req, res, next) => {
	try {
		const { lessonId } = req.params;
		const { userId } = req.body;
		
		if (!userId) {
			return res.status(400).json({ 
				success: false, 
				error: 'userId est requis' 
			});
		}

		const result = await courseService.completeLessonForUser(lessonId, userId);
		res.json({ success: true, data: result });
	} catch (error) {
		next(error);
	}
};

// Get all courses with filters
const getCourses = async (req, res) => {
	try {
		const filters = {
			page: parseInt(req.query.page) || 1,
			limit: parseInt(req.query.limit) || 20,
			search: req.query.search,
			stepId: req.query.stepId,
			isPublished: req.query.isPublished !== undefined ? req.query.isPublished === 'true' : undefined,
			isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
			sortBy: req.query.sortBy || 'createdAt',
			sortOrder: req.query.sortOrder || 'desc',
		};
		const result = await courseService.getCourses(filters);
		res.status(200).json({
			success: true,
			...result,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message || 'Erreur lors de la récupération des cours',
		});
	}
};

// Get single course by ID
const getCourse = async (req, res) => {
	try {
		const { id } = req.params;
		const course = await courseService.getCourse(id);
		res.status(200).json({
			success: true,
			data: course,
		});
	} catch (error) {
		res.status(404).json({
			success: false,
			message: error.message || 'Cours non trouvé',
		});
	}
};

// Create new course
const createCourse = async (req, res) => {
	try {
		const { error, value } = createCourseSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				message: error.details[0].message,
			});
		}
		const course = await courseService.createCourse(value);
		res.status(201).json({
			success: true,
			data: course,
			message: 'Le cours a été créé avec succès.',
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message || 'Erreur lors de la création du cours',
		});
	}
};

// Update course
const updateCourse = async (req, res) => {
	try {
		const { error, value } = updateCourseSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				message: error.details[0].message,
			});
		}
		const { id } = req.params;
		const course = await courseService.updateCourse(id, value);
		res.status(200).json({
			success: true,
			data: course,
			message: 'Cours mis à jour avec succès',
		});
	} catch (error) {
		const statusCode = error.message && error.message.includes('non trouvé') ? 404 : 400;
		res.status(statusCode).json({
			success: false,
			message: error.message || 'Erreur lors de la mise à jour du cours',
		});
	}
};

// Update course partially
const patchCourse = async (req, res) => {
	try {
		const { error, value } = patchCourseSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				message: error.details[0].message,
			});
		}
		const { id } = req.params;
		const course = await courseService.patchCourse(id, value);
		res.status(200).json({
			success: true,
			data: course,
			message: 'Cours mis à jour partiellement avec succès',
		});
	} catch (error) {
		const statusCode = error.message && error.message.includes('non trouvé') ? 404 : 400;
		res.status(statusCode).json({
			success: false,
			message: error.message || 'Erreur lors de la mise à jour partielle du cours',
		});
	}
};

// Delete course
const deleteCourse = async (req, res) => {
	try {
		const { id } = req.params;
		await courseService.deleteCourse(id);
		res.status(200).json({
			success: true,
			message: 'Cours supprimé avec succès',
		});
	} catch (error) {
		const statusCode = error.message && error.message.includes('non trouvé') ? 404 : 400;
		res.status(statusCode).json({
			success: false,
			message: error.message || 'Erreur lors de la suppression du cours',
		});
	}
};

// Duplicate course
const duplicateCourse = async (req, res) => {
	try {
		const { id } = req.params;
		const course = await courseService.duplicateCourse(id);
		res.status(201).json({
			success: true,
			data: course,
			message: 'Cours dupliqué avec succès',
		});
	} catch (error) {
		const statusCode = error.message && error.message.includes('non trouvé') ? 404 : 400;
		res.status(statusCode).json({
			success: false,
			message: error.message || 'Erreur lors de la duplication du cours',
		});
	}
};

// Toggle course publish status
const toggleCoursePublish = async (req, res) => {
	try {
		const { id } = req.params;
		const course = await courseService.toggleCoursePublish(id);
		res.status(200).json({
			success: true,
			data: course,
			message: `Cours ${course.isPublished ? 'publié' : 'dépublié'} avec succès`,
		});
	} catch (error) {
		const statusCode = error.message && error.message.includes('non trouvé') ? 404 : 400;
		res.status(statusCode).json({
			success: false,
			message: error.message || 'Erreur lors de la modification du statut de publication',
		});
	}
};

// Get courses by level (étape)
const getCoursesByLevel = async (req, res) => {
	try {
		const { levelId } = req.params;
		const courses = await courseService.getCoursesByLevel(levelId);
		res.status(200).json({
			success: true,
			data: courses,
		});
	} catch (error) {
		const statusCode = error.message && error.message.includes('non trouvé') ? 404 : 400;
		res.status(statusCode).json({
			success: false,
			message: error.message || "Erreur lors de la récupération des cours de l'étape",
		});
	}
};

module.exports = {
	getCoursesByUserId,
	startCourse,
	completeCourse,
	completeLesson,
	getCourses,
	getCourse,
	createCourse,
	updateCourse,
	patchCourse,
	deleteCourse,
	duplicateCourse,
	toggleCoursePublish,
	getCoursesByLevel,
};
