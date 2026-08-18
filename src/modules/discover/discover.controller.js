const discoverService = require('./discover.service');
const { tryDemoSchema } = require('./discover.schema');

const getLanguages = async (req, res, next) => {
  try {
    const languages = await discoverService.getDiscoverableLanguages();
    res.status(200).json({ success: true, data: languages });
  } catch (err) { next(err); }
};

const getPreview = async (req, res, next) => {
  try {
    const preview = await discoverService.getLanguagePreview(req.params.code);
    if (!preview) return res.status(404).json({ success: false, message: 'Langue non trouvée.' });
    res.status(200).json({ success: true, data: preview });
  } catch (err) { next(err); }
};

const getDemo = async (req, res, next) => {
  try {
    const demo = await discoverService.getLanguageDemo(req.params.code);
    if (!demo) return res.status(404).json({ success: false, message: 'Aucune démonstration disponible pour cette langue.' });
    res.status(200).json({ success: true, data: demo });
  } catch (err) { next(err); }
};

const tryDemoExercise = async (req, res, next) => {
  try {
    const { error, value } = tryDemoSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const result = await discoverService.tryDemo(req.params.contentId, value.answer);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

module.exports = { getLanguages, getPreview, getDemo, tryDemoExercise };
