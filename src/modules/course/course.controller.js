const courseService = require('./course.service');
const { createCourseSchema, updateCourseSchema, patchCourseSchema } = require('./course.schema');
const { logger } = require('../../utils/logger');

const getCoursesByUserId = async (req, res, next) => {
  try {
    const courses = await courseService.getCoursesByUserId(req.params.userId);
    if (!courses || courses.length === 0)
      return res.status(404).json({ success: false, error: 'Aucun cours trouvé pour cet utilisateur' });
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
};

const startCourse = async (req, res, next) => {
  try {
    const { userId, courseId } = req.params;
    const progress = await courseService.startCourseForUser(userId, courseId);
    res.json({ success: true, data: progress });
  } catch (err) { next(err); }
};

const completeCourse = async (req, res, next) => {
  try {
    const { userId, courseId } = req.params;
    const progress = await courseService.completeCourseForUser(userId, courseId);
    res.json({ success: true, data: progress });
  } catch (err) { next(err); }
};

const completeLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId est requis' });
    const result = await courseService.completeLessonForUser(lessonId, userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

const getLessonsByStep = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const { userId } = req.query;
    const lessons = await courseService.getLessonsByStep(stepId, userId);
    res.json({ success: true, data: lessons });
  } catch (err) { next(err); }
};

const getCourses = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
      stepId: req.query.stepId,
      contentType: req.query.contentType,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };
    const result = await courseService.getCourses(filters);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Erreur serveur' });
  }
};

const getCourse = async (req, res) => {
  try {
    const course = await courseService.getCourse(req.params.id);
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message || 'Cours non trouvé' });
  }
};

const createCourse = async (req, res) => {
  try {
    logger.info('[createCourse] body: ' + JSON.stringify(req.body));
    const { error, value } = createCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    logger.info('[createCourse] value validé: ' + JSON.stringify(value));
    const course = await courseService.createCourse(value);
    res.status(201).json({ success: true, data: course, message: 'Cours créé avec succès.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Erreur lors de la création' });
  }
};

const updateCourse = async (req, res) => {
  try {
    logger.info('[updateCourse] id: ' + req.params.id + ' | body: ' + JSON.stringify(req.body));
    const { error, value } = updateCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    logger.info('[updateCourse] value validé: ' + JSON.stringify(value));
    const course = await courseService.updateCourse(req.params.id, value);
    res.status(200).json({ success: true, data: course, message: 'Cours mis à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message || 'Erreur de mise à jour' });
  }
};

const patchCourse = async (req, res) => {
  try {
    const { error, value } = patchCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const course = await courseService.patchCourse(req.params.id, value);
    res.status(200).json({ success: true, data: course, message: 'Cours mis à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message || 'Erreur de mise à jour' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    await courseService.deleteCourse(req.params.id);
    res.status(200).json({ success: true, message: 'Cours supprimé.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message || 'Erreur de suppression' });
  }
};

const duplicateCourse = async (req, res) => {
  try {
    const course = await courseService.duplicateCourse(req.params.id);
    res.status(201).json({ success: true, data: course, message: 'Cours dupliqué.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message || 'Erreur de duplication' });
  }
};

const toggleCoursePublish = async (req, res) => {
  try {
    const course = await courseService.toggleCoursePublish(req.params.id);
    res.status(200).json({ success: true, data: course, message: `Cours ${course.isActive ? 'activé' : 'désactivé'}.` });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message || 'Erreur' });
  }
};

const getCoursesByLevel = async (req, res) => {
  try {
    const courses = await courseService.getCoursesByLevel(req.params.levelId);
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Erreur' });
  }
};

module.exports = {
  getCoursesByUserId, startCourse, completeCourse, completeLesson,
  getLessonsByStep, getCourses, getCourse, createCourse, updateCourse,
  patchCourse, deleteCourse, duplicateCourse, toggleCoursePublish, getCoursesByLevel
};
