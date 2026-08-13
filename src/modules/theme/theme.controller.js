const themeService = require('./theme.service');
const { createThemeSchema, updateThemeSchema } = require('./theme.schema');

const getThemes = async (req, res, next) => {
  try {
    const filters = {
      page:      parseInt(req.query.page)  || 1,
      limit:     parseInt(req.query.limit) || 20,
      search:    req.query.search,
      moduleId:  req.query.moduleId,
      sortBy:    req.query.sortBy    || 'index',
      sortOrder: req.query.sortOrder || 'asc'
    };
    const result = await themeService.getThemes(filters);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getThemesByModuleId = async (req, res, next) => {
  try {
    const themes = await themeService.getThemesByModuleId(req.params.moduleId);
    res.status(200).json({ success: true, data: themes });
  } catch (err) { next(err); }
};

const getTheme = async (req, res, next) => {
  try {
    const theme = await themeService.getTheme(req.params.id);
    res.status(200).json({ success: true, data: theme });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const createTheme = async (req, res, next) => {
  try {
    const { error, value } = createThemeSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const theme = await themeService.createTheme(value);
    res.status(201).json({ success: true, data: theme, message: 'Thème créé avec succès.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const updateTheme = async (req, res, next) => {
  try {
    const { error, value } = updateThemeSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const theme = await themeService.updateTheme(req.params.id, value);
    res.status(200).json({ success: true, data: theme, message: 'Thème mis à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const deleteTheme = async (req, res, next) => {
  try {
    await themeService.deleteTheme(req.params.id);
    res.status(200).json({ success: true, message: 'Thème supprimé.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

module.exports = { getThemes, getThemesByModuleId, getTheme, createTheme, updateTheme, deleteTheme };
