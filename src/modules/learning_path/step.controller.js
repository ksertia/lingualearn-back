const service = require('./step.service');
const { createStepSchema, updateStepSchema } = require('./step.schema');

async function create(req, res, next) {
  try {
    const { error, value } = createStepSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const step = await service.createStep({
      title: value.title,
      stepNumber: value.stepNumber,
      levelId: value.levelId
    });
    res.status(201).json(step);
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const steps = await service.getAllSteps();
    res.json(steps);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const step = await service.getStepById(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });
    res.json(step);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { error, value } = updateStepSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const step = await service.updateStep(req.params.id, value);
    res.json(step);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteStep(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove
};