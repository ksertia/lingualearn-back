// Progression endpoints
exports.selectStep = async (req, res, next) => {
  try {
    const { userId, stepId } = req.params;
    const progress = await stepService.selectStepForUser(userId, stepId);
    res.status(201).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

exports.startStep = async (req, res, next) => {
  try {
    const { userId, stepId } = req.params;
    const progress = await stepService.startStepForUser(userId, stepId);
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

exports.completeStep = async (req, res, next) => {
  try {
    const { userId, stepId } = req.params;
    const progress = await stepService.completeStepForUser(userId, stepId);
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};
exports.getByUserId = async (req, res, next) => {
  try {
    const steps = await stepService.getStepsByUserId(req.params.userId);
    if (!steps || steps.length === 0) {
      return res.status(404).json({ error: 'Aucune étape trouvée pour cet utilisateur' });
    }
    res.json({ data: steps });
  } catch (err) {
    next(err);
  }
};
const stepService = require('./step.service');
const { createStepSchema, updateStepSchema } = require('./step.schema');
const { asyncHandler } = require('../../middleware/asyncHandler');


exports.create = asyncHandler(async (req, res) => {
  const { error, value } = createStepSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // Only keep valid Step fields
  const step = await stepService.create(value);
  res.status(201).json(step);
});

exports.getAll = asyncHandler(async (req, res) => {
  const steps = await stepService.getAll();
  res.json(steps);
});

exports.getById = asyncHandler(async (req, res) => {
  const step = await stepService.getById(req.params.id);
  if (!step) return res.status(404).json({ error: 'Step not found' });
  res.json(step);
});


exports.update = asyncHandler(async (req, res) => {
  const { error, value } = updateStepSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const step = await stepService.update(req.params.id, value);
  if (!step) return res.status(404).json({ error: 'Step not found' });
  res.json(step);
});

exports.remove = asyncHandler(async (req, res) => {
  const deleted = await stepService.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Step not found' });
  res.json({ success: true });
});
