const courseService = require('./course.service');
const {
  createCourseSchema, updateCourseSchema, patchCourseSchema,
  createBlockSchema, updateBlockSchema, reorderBlocksSchema
} = require('./course.schema');
const { logger } = require('../../utils/logger');

// ─── LEÇON ─────────────────────────────────────────────────────────────────────

const getCourses = async (req, res, next) => {
  try {
    const filters = {
      page:      parseInt(req.query.page)  || 1,
      limit:     parseInt(req.query.limit) || 20,
      search:    req.query.search,
      stepId:    req.query.stepId,
      sortBy:    req.query.sortBy    || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };
    const result = await courseService.getCourses(filters);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getCourse = async (req, res, next) => {
  try {
    const course = await courseService.getCourse(req.params.id);
    res.status(200).json({ success: true, data: course });
  } catch (err) { next(err); }
};

const getCoursesByUserId = async (req, res, next) => {
  try {
    const courses = await courseService.getCoursesByUserId(req.params.userId);
    if (!courses || courses.length === 0)
      return res.status(404).json({ success: false, error: 'Aucune leçon trouvée' });
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
};

const getLessonsByStep = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const { userId } = req.query;
    const lesson = await courseService.getLessonsByStep(stepId, userId);
    res.json({ success: true, data: lesson });
  } catch (err) { next(err); }
};

const getCoursesByLevel = async (req, res, next) => {
  try {
    const courses = await courseService.getCoursesByLevel(req.params.levelId);
    res.status(200).json({ success: true, data: courses });
  } catch (err) { next(err); }
};

const createCourse = async (req, res, next) => {
  try {
    logger.info('[createCourse] body: ' + JSON.stringify(req.body));
    const { error, value } = createCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    logger.info('[createCourse] value validé: ' + JSON.stringify(value));
    const course = await courseService.createCourse(value);
    res.status(201).json({ success: true, data: course, message: 'Leçon créée avec succès.' });
  } catch (err) { next(err); }
};

const updateCourse = async (req, res, next) => {
  try {
    logger.info('[updateCourse] id: ' + req.params.id + ' | body: ' + JSON.stringify(req.body));
    const { error, value } = updateCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    logger.info('[updateCourse] value validé: ' + JSON.stringify(value));
    const course = await courseService.updateCourse(req.params.id, value);
    res.status(200).json({ success: true, data: course, message: 'Leçon mise à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const patchCourse = async (req, res, next) => {
  try {
    const { error, value } = patchCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const course = await courseService.patchCourse(req.params.id, value);
    res.status(200).json({ success: true, data: course, message: 'Leçon mise à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    await courseService.deleteCourse(req.params.id);
    res.status(200).json({ success: true, message: 'Leçon supprimée.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const duplicateCourse = async (req, res, next) => {
  try {
    const course = await courseService.duplicateCourse(req.params.id);
    res.status(201).json({ success: true, data: course, message: 'Leçon dupliquée.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const toggleCoursePublish = async (req, res, next) => {
  try {
    const course = await courseService.toggleCoursePublish(req.params.id);
    res.status(200).json({ success: true, data: course, message: `Leçon ${course.isActive ? 'activée' : 'désactivée'}.` });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
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

// ─── BLOCS ─────────────────────────────────────────────────────────────────────

const addBlock = async (req, res, next) => {
  try {
    const { error, value } = createBlockSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const block = await courseService.addBlock(req.params.id, value);
    res.status(201).json({ success: true, data: block, message: 'Bloc ajouté.' });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Un bloc existe déjà à cet index pour cette leçon.' });
    }
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const updateBlock = async (req, res, next) => {
  try {
    const { error, value } = updateBlockSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const block = await courseService.updateBlock(req.params.blockId, value);
    res.status(200).json({ success: true, data: block, message: 'Bloc mis à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const deleteBlock = async (req, res, next) => {
  try {
    await courseService.deleteBlock(req.params.blockId);
    res.status(200).json({ success: true, message: 'Bloc supprimé.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const reorderBlocks = async (req, res, next) => {
  try {
    const { error, value } = reorderBlocksSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const lesson = await courseService.reorderBlocks(req.params.id, value.orderedIds);
    res.status(200).json({ success: true, data: lesson, message: 'Blocs réordonnés.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCourses, getCourse, getCoursesByUserId, getLessonsByStep, getCoursesByLevel,
  createCourse, updateCourse, patchCourse, deleteCourse, duplicateCourse, toggleCoursePublish,
  completeLesson, startCourse, completeCourse,
  addBlock, updateBlock, deleteBlock, reorderBlocks
};
