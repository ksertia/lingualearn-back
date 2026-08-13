const contentService = require('./content.service');
const {
  createContentSchema, updateContentSchema,
  createBlockSchema, updateBlockSchema, reorderBlocksSchema,
  submitExerciseSchema
} = require('./content.schema');

// ─── CONTENU ────────────────────────────────────────────────────────────────────

const getContents = async (req, res, next) => {
  try {
    const filters = {
      page:        parseInt(req.query.page)  || 1,
      limit:       parseInt(req.query.limit) || 20,
      search:      req.query.search,
      subThemeId:  req.query.subThemeId,
      contentType: req.query.contentType,
      sortBy:      req.query.sortBy    || 'index',
      sortOrder:   req.query.sortOrder || 'asc'
    };
    const result = await contentService.getContents(filters);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getContentsBySubThemeId = async (req, res, next) => {
  try {
    const contents = await contentService.getContentsBySubThemeId(req.params.subThemeId);
    res.status(200).json({ success: true, data: contents });
  } catch (err) { next(err); }
};

const getContent = async (req, res, next) => {
  try {
    const content = await contentService.getContent(req.params.id);
    res.status(200).json({ success: true, data: content });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const createContent = async (req, res, next) => {
  try {
    const { error, value } = createContentSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const content = await contentService.createContent(value);
    res.status(201).json({ success: true, data: content, message: 'Contenu créé avec succès.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const updateContent = async (req, res, next) => {
  try {
    const { error, value } = updateContentSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const content = await contentService.updateContent(req.params.id, value);
    res.status(200).json({ success: true, data: content, message: 'Contenu mis à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const deleteContent = async (req, res, next) => {
  try {
    await contentService.deleteContent(req.params.id);
    res.status(200).json({ success: true, message: 'Contenu supprimé.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

// ─── BLOCS ─────────────────────────────────────────────────────────────────────

const addBlock = async (req, res, next) => {
  try {
    const { error, value } = createBlockSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const block = await contentService.addBlock(req.params.id, value);
    res.status(201).json({ success: true, data: block, message: 'Bloc ajouté.' });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Un bloc existe déjà à cet index pour ce contenu.' });
    }
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const updateBlock = async (req, res, next) => {
  try {
    const { error, value } = updateBlockSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const block = await contentService.updateBlock(req.params.blockId, value);
    res.status(200).json({ success: true, data: block, message: 'Bloc mis à jour.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const deleteBlock = async (req, res, next) => {
  try {
    await contentService.deleteBlock(req.params.blockId);
    res.status(200).json({ success: true, message: 'Bloc supprimé.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const reorderBlocks = async (req, res, next) => {
  try {
    const { error, value } = reorderBlocksSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const content = await contentService.reorderBlocks(req.params.id, value.orderedIds);
    res.status(200).json({ success: true, data: content, message: 'Blocs réordonnés.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

// ─── SOUMISSION EXERCICE ────────────────────────────────────────────────────────

const submitExercise = async (req, res, next) => {
  try {
    const { error, value } = submitExerciseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const result = await contentService.submitExercise(req.params.id, value.userId, value.answer);
    res.status(200).json({ success: true, data: result, message: 'Réponse soumise.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

module.exports = {
  getContents, getContentsBySubThemeId, getContent, createContent, updateContent, deleteContent,
  addBlock, updateBlock, deleteBlock, reorderBlocks,
  submitExercise
};
