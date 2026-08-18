const express = require('express');
const controller = require('./discover.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Discover
 *   description: |
 *     Découverte publique du contenu pédagogique, sans compte utilisateur.
 *     Lecture seule sur le vrai contenu (Language/Level/Module/Theme/SubTheme/Content) —
 *     aucune donnée dupliquée, aucune écriture en base. Le test de niveau à l'inscription
 *     n'est pas couvert ici.
 */

/**
 * @swagger
 * /api/v1/discover/languages:
 *   get:
 *     summary: Liste des langues disponibles à la découverte
 *     tags: [Discover]
 *     responses:
 *       200:
 *         description: Liste des langues actives
 */
router.get('/languages', controller.getLanguages);

/**
 * @swagger
 * /api/v1/discover/languages/{code}/preview:
 *   get:
 *     summary: Aperçu de la structure pédagogique d'une langue (premier niveau)
 *     description: |
 *       Retourne le premier niveau de la langue avec ses modules et thèmes
 *       (titres/descriptions uniquement — aucun contenu détaillé, aucun exercice).
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Code de la langue (ex. DYU, MOS)
 *     responses:
 *       200:
 *         description: Aperçu de la langue
 *       404:
 *         description: Langue non trouvée
 */
router.get('/languages/:code/preview', controller.getPreview);

/**
 * @swagger
 * /api/v1/discover/languages/{code}/demo:
 *   get:
 *     summary: Sous-thème de démonstration d'une langue (cours + exercice)
 *     description: |
 *       Retourne le sous-thème marqué comme démo pour cette langue, avec son cours
 *       (blocks inclus) et son exercice — sans la réponse correcte ni l'explication,
 *       qui ne sont révélées qu'après une tentative via POST /demo/{contentId}/try.
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contenu de démonstration
 *       404:
 *         description: Aucune démonstration disponible pour cette langue
 */
router.get('/languages/:code/demo', controller.getDemo);

/**
 * @swagger
 * /api/v1/discover/demo/{contentId}/try:
 *   post:
 *     summary: Tenter l'exercice de démonstration (sans compte)
 *     description: |
 *       Compare la réponse à la bonne réponse et retourne isCorrect + explanation.
 *       Aucune écriture en base (pas de ContentAttempt). Le contentId doit appartenir
 *       à un sous-thème marqué comme démo, sinon 404 — empêche de sonder le catalogue réel.
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answer]
 *             properties:
 *               answer:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *     responses:
 *       200:
 *         description: Résultat de la tentative
 *       404:
 *         description: Exercice de démonstration non trouvé
 */
router.post('/demo/:contentId/try', controller.tryDemoExercise);

module.exports = router;
