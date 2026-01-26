const adminService = require('./admin.service');

// ============================================================================
// OPTION A: DASHBOARD CONTROLLERS
// ============================================================================

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
const getDashboard = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

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
const createCourse = async (req, res) => {
  try {
    const course = await adminService.createCourse(req.body);
    
    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully',
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

// ============================================================================
// OPTION C: USER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all users with filters
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      accountType: req.query.accountType,
      isActive: req.query.isActive,
      isVerified: req.query.isVerified,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await adminService.getAllUsers(filters);
    
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
 * @desc    Get single user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
const getUser = async (req, res) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/admin/users/:id/stats
 * @access  Private/Admin
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await adminService.getUserStats(req.params.id);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Reset user password
 * @route   POST /api/admin/users/:id/reset-password
 * @access  Private/Admin
 */
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required',
      });
    }

    const result = await adminService.resetUserPassword(req.params.id, newPassword);
    
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
 * @desc    Toggle user active status
 * @route   PATCH /api/admin/users/:id/toggle-active
 * @access  Private/Admin
 */
const toggleUserActive = async (req, res) => {
  try {
    const user = await adminService.toggleUserActive(req.params.id);
    
    res.status(200).json({
      success: true,
      data: user,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Verify user manually
 * @route   PATCH /api/admin/users/:id/verify
 * @access  Private/Admin
 */
const verifyUser = async (req, res) => {
  try {
    const user = await adminService.verifyUser(req.params.id);
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'User verified successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    const result = await adminService.deleteUser(req.params.id);
    
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


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Dashboard
  getDashboard,
  
  // Courses
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  duplicateCourse,
  toggleCoursePublish,
  
  // Users
  getUsers,
  getUser,
  getUserStats,
  resetUserPassword,
  toggleUserActive,
  verifyUser,
  deleteUser,
};