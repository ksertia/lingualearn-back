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
    const progress = await service.completeModuleWithAutoUnlock(userId, moduleId);
    res.json({ 
      success: true, 
      message: 'Module complété avec succès. Prochain module débloqué automatiquement.',
      data: progress 
    });
  } catch (err) {
    next(err);
  }
};
exports.getByUserId = async (req, res, next) => {
  try {
    const modules = await service.getModulesByUserId(req.params.userId);
    // Retourner un tableau vide si aucun niveau sélectionné (comportement normal)
    res.json({ success: true, data: modules });
  } catch (err) {
    next(err);
  }
};
const service = require('./module.service');

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
