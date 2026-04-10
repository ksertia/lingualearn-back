const service = require('./discover.service');

// ── SECTIONS ─────────────────────────────────────────────────────────────────

async function listSections(req, res) {
  const sections = await service.getSections();
  res.json({ success: true, data: sections });
}

async function getSection(req, res) {
  const section = await service.getSectionById(req.params.id);
  if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
  res.json({ success: true, data: section });
}

async function createSection(req, res) {
  const section = await service.createSection(req.body);
  res.status(201).json({ success: true, data: section });
}

async function updateSection(req, res) {
  const section = await service.updateSection(req.params.id, req.body);
  res.json({ success: true, data: section });
}

async function deleteSection(req, res) {
  await service.deleteSection(req.params.id);
  res.json({ success: true, message: 'Section deleted' });
}

// ── CONTENTS ─────────────────────────────────────────────────────────────────

async function createContent(req, res) {
  const content = await service.createContent(req.params.sectionId, req.body);
  res.status(201).json({ success: true, data: content });
}

async function updateContent(req, res) {
  const content = await service.updateContent(req.params.contentId, req.body);
  res.json({ success: true, data: content });
}

async function deleteContent(req, res) {
  await service.deleteContent(req.params.contentId);
  res.json({ success: true, message: 'Content deleted' });
}

module.exports = {
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  createContent,
  updateContent,
  deleteContent,
};
