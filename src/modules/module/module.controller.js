const service = require('./module.service');

// Progression endpoints
exports.startModule = async (req, res, next) => {
  try {
    const { userId, moduleId } = req.params;
    const progress = await service.startModuleForUser(userId, moduleId);
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

exports.completeModule = async (req, res, next) => {
  try {
    const { userId, moduleId } = req.params;
    const progress = await service.completeModuleForUser(userId, moduleId);
    res.json({
      success: true,
      message: 'Module complété avec succès.',
      data: progress
    });
  } catch (err) {
    next(err);
  }
};
exports.getByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { levelId } = req.query;
    const modules = await service.getModulesByUserId(userId, levelId || null);
    res.json({ success: true, data: modules });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const module = await service.create(req.body);
    res.status(201).json({ success: true, data: module });
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const modules = await service.getAll();
    res.json({ success: true, data: modules });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const module = await service.getById(req.params.id);
    if (!module) return res.status(404).json({ success: false, error: 'Module non trouvé' });
    res.json({ success: true, data: module });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const module = await service.update(req.params.id, req.body);
    if (!module) return res.status(404).json({ success: false, error: 'Module non trouvé' });
    res.json({ success: true, data: module });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const deleted = await service.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Module non trouvé' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
