const express = require('express');
const controller = require('./upload.controller');
const { uploadImage, uploadCourseContent } = require('../../utils/uploadService');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Gestion des uploads de fichiers (images, vidéos, audios, PDFs)
 */

/**
 * @swagger
 * /api/v1/uploads/image:
 *   post:
 *     summary: Uploader une image
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image (JPEG, PNG, GIF, WebP)
 *     responses:
 *       200:
 *         description: Image uploadée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     url:
 *                       type: string
 *                     originalName:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimetype:
 *                       type: string
 *       400:
 *         description: Erreur d'upload
 */
router.post('/image', uploadImage.single('image'), controller.uploadImage);

/**
 * @swagger
 * /api/v1/uploads/video:
 *   post:
 *     summary: Uploader une vidéo
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Fichier vidéo (MP4, WebM)
 *     responses:
 *       200:
 *         description: Vidéo uploadée avec succès
 *       400:
 *         description: Erreur d'upload
 */
router.post('/video', uploadCourseContent.single('content'), controller.uploadVideo);

/**
 * @swagger
 * /api/v1/uploads/audio:
 *   post:
 *     summary: Uploader un audio
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Fichier audio (MP3, WAV)
 *     responses:
 *       200:
 *         description: Audio uploadé avec succès
 *       400:
 *         description: Erreur d'upload
 */
router.post('/audio', uploadCourseContent.single('content'), controller.uploadAudio);

/**
 * @swagger
 * /api/v1/uploads/pdf:
 *   post:
 *     summary: Uploader un PDF
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF
 *     responses:
 *       200:
 *         description: PDF uploadé avec succès
 *       400:
 *         description: Erreur d'upload
 */
router.post('/pdf', uploadCourseContent.single('content'), controller.uploadPdf);

/**
 * @swagger
 * /api/v1/uploads/content:
 *   post:
 *     summary: Uploader tout type de contenu (vidéo, audio, PDF)
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 format: binary
 *                 description: Fichier contenu (MP4, WebM, MP3, WAV, PDF)
 *     responses:
 *       200:
 *         description: Contenu uploadé avec succès
 *       400:
 *         description: Erreur d'upload
 */
router.post('/content', uploadCourseContent.single('content'), controller.uploadContent);

module.exports = router;
