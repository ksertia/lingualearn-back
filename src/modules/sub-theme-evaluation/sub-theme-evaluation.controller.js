const service = require('./sub-theme-evaluation.service');
const { createEvaluationSchema, updateEvaluationSchema, submitEvaluationSchema } = require('./sub-theme-evaluation.schema');

const create = async (req, res, next) => {
  try {
    const { error, value } = createEvaluationSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const evaluation = await service.createEvaluation(value);
    res.status(201).json({ success: true, data: evaluation, message: 'Évaluation créée avec succès.' });
  } catch (err) {
    if (err.message?.includes('non trouvé')) return res.status(404).json({ success: false, message: err.message });
    if (err.message?.includes('existe déjà')) return res.status(409).json({ success: false, message: err.message });
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const evaluation = await service.getEvaluation(req.params.id);
    res.status(200).json({ success: true, data: evaluation });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const getBySubThemeId = async (req, res, next) => {
  try {
    const evaluation = await service.getEvaluationBySubThemeId(req.params.subThemeId);
    res.status(200).json({ success: true, data: evaluation });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateEvaluationSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const evaluation = await service.updateEvaluation(req.params.id, value);
    res.status(200).json({ success: true, data: evaluation, message: 'Évaluation mise à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const remove = async (req, res, next) => {
  try {
    await service.deleteEvaluation(req.params.id);
    res.status(200).json({ success: true, message: 'Évaluation supprimée.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const submit = async (req, res, next) => {
  try {
    const { error, value } = submitEvaluationSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const result = await service.submitEvaluation(req.params.id, value.userId, value.answers);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.message?.includes('non trouvée')) return res.status(404).json({ success: false, message: err.message });
    if (err.message?.includes('maximum de tentatives')) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
};

module.exports = { create, getById, getBySubThemeId, update, remove, submit };
