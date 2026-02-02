const evaluationService = require('./evaluation.service');
const { submitEvaluationSchema } = require('./evaluation.schema');

exports.submitEvaluation = async (req, res, next) => {
  try {
    const { error, value } = submitEvaluationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const result = await evaluationService.submitEvaluation(value);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getUserEvaluations = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const results = await evaluationService.getUserEvaluations(userId);
    res.json(results);
  } catch (err) {
    next(err);
  }
};
