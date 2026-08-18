const subThemeService = require('./sub-theme.service');
const { createSubThemeSchema, updateSubThemeSchema } = require('./sub-theme.schema');

const getSubThemes = async (req, res, next) => {
  try {
    const filters = {
      page:      parseInt(req.query.page)  || 1,
      limit:     parseInt(req.query.limit) || 20,
      search:    req.query.search,
      themeId:   req.query.themeId,
      sortBy:    req.query.sortBy    || 'index',
      sortOrder: req.query.sortOrder || 'asc'
    };
    const result = await subThemeService.getSubThemes(filters);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getSubThemesByThemeId = async (req, res, next) => {
  try {
    const subThemes = await subThemeService.getSubThemesByThemeId(req.params.themeId, req.query.userId || null);
    res.status(200).json({ success: true, data: subThemes });
  } catch (err) { next(err); }
};

const getSubTheme = async (req, res, next) => {
  try {
    const subTheme = await subThemeService.getSubTheme(req.params.id);
    res.status(200).json({ success: true, data: subTheme });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const createSubTheme = async (req, res, next) => {
  try {
    const { error, value } = createSubThemeSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const subTheme = await subThemeService.createSubTheme(value);
    res.status(201).json({ success: true, data: subTheme, message: 'Sous-thème créé avec succès.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const updateSubTheme = async (req, res, next) => {
  try {
    const { error, value } = updateSubThemeSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const subTheme = await subThemeService.updateSubTheme(req.params.id, value);
    res.status(200).json({ success: true, data: subTheme, message: 'Sous-thème mis à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const deleteSubTheme = async (req, res, next) => {
  try {
    await subThemeService.deleteSubTheme(req.params.id);
    res.status(200).json({ success: true, message: 'Sous-thème supprimé.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

module.exports = { getSubThemes, getSubThemesByThemeId, getSubTheme, createSubTheme, updateSubTheme, deleteSubTheme };
