const express = require('express');
const router = express.Router();
const discoverController = require('./discover.controller');


/**
 * @swagger
 * /api/v1/discover/languages:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer les langues pour la découverte
 *     description: Retourne la liste des langues disponibles pour la découverte de l'application.
 *     responses:
 *       200:
 *         description: Liste des langues
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Language'
 */
router.get('/languages', discoverController.getLanguages);


/**
 * @swagger
 * /api/v1/discover/exercises:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer les exercices de découverte
 *     description: Retourne la liste des exercices de découverte de l'application.
 *     responses:
 *       200:
 *         description: Liste des exercices de découverte
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/exercises', discoverController.getExercises);

module.exports = router;
