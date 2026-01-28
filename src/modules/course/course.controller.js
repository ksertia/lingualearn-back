const courseService = require('./course.service');
const {
	createCourseSchema,
	updateCourseSchema,
	patchCourseSchema
} = require('./course.schema');

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
