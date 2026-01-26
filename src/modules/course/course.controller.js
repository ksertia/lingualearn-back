// ============================================================================
// OPTION B: COURSE MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all courses with filters
 * @route   GET /api/admin/courses
 * @access  Private/Admin
 */
const getCourses = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      trackId: req.query.trackId,
      isPublished: req.query.isPublished,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await adminService.getAllCourses(filters);
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * @desc    Get single course by ID
 * @route   GET /api/admin/courses/:id
 * @access  Private/Admin
 */
const getCourse = async (req, res) => {
  try {
    const course = await adminService.getCourseById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * @desc    Create new course
 * @route   POST /api/admin/courses
 * @access  Private/Admin
 */
const { createCourseSchema } = require('./course.schema');
const courseService = require('./course.service');

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
      message: error.message,
    });
  }
};

/**
 * @desc    Update course
 * @route   PUT /api/admin/courses/:id
 * @access  Private/Admin
 */
const updateCourse = async (req, res) => {
  try {
    const course = await adminService.updateCourse(req.params.id, req.body);
    
    res.status(200).json({
      success: true,
      data: course,
      message: 'Course updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Delete course
 * @route   DELETE /api/admin/courses/:id
 * @access  Private/Admin
 */
const deleteCourse = async (req, res) => {
  try {
    const result = await adminService.deleteCourse(req.params.id);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Duplicate course
 * @route   POST /api/admin/courses/:id/duplicate
 * @access  Private/Admin
 */
const duplicateCourse = async (req, res) => {
  try {
    const course = await adminService.duplicateCourse(req.params.id);
    
    res.status(201).json({
      success: true,
      data: course,
      message: 'Course duplicated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Toggle course publish status
 * @route   PATCH /api/admin/courses/:id/toggle-publish
 * @access  Private/Admin
 */
const toggleCoursePublish = async (req, res) => {
  try {
    const course = await adminService.toggleCoursePublish(req.params.id);
    
    res.status(200).json({
      success: true,
      data: course,
      message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
