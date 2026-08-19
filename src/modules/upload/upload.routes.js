const express = require('express');
const controller = require('./upload.controller');
const { uploadImage, uploadCourseContent } = require('../../utils/uploadService');
const router = express.Router();

// Middleware pour gérer les erreurs multer
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('Erreur multer:', err);
        return res.status(400).json({
            success: false,
            message: err.message || 'Erreur lors de l\'upload du fichier',
            code: err.code
        });
    }
    next();
};

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: |
 *     Gestion des uploads de fichiers, stockés localement sur le serveur (dossier
 *     storage/uploads, servi via /media). Images/audio/PDF sont traités
 *     immédiatement (statut ready). Les vidéos sont mises en file d'attente
 *     (BullMQ + Redis) et transcodées en HLS adaptatif (360p/480p/720p) par un
 *     worker séparé (src/worker.js) — la réponse initiale renvoie un assetId à
 *     interroger via GET /uploads/{assetId} jusqu'à passage en statut ready.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MediaAsset:
 *       type: object
 *       properties:
 *         id:            { type: string }
 *         mediaType:     { type: string, enum: [image, video, audio, pdf] }
 *         status:        { type: string, enum: [processing, ready, failed] }
 *         originalName:  { type: string }
 *         mimeType:      { type: string }
 *         sizeBytes:     { type: integer }
 *         url:           { type: string, nullable: true, description: "Chemin public une fois ready (playlist .m3u8 pour vidéo)" }
 *         errorMessage:  { type: string, nullable: true }
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
router.post('/image', uploadImage.single('image'), handleMulterError, controller.uploadImage);

/**
 * @swagger
 * /api/v1/uploads/video:
 *   post:
 *     summary: Uploader une vidéo (transcodage HLS asynchrone)
 *     description: |
 *       Le fichier est reçu puis mis en file d'attente pour transcodage HLS.
 *       La réponse (202) contient un assetId — interroger GET /uploads/{assetId}
 *       jusqu'à status=ready pour récupérer l'URL de la playlist HLS finale.
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
 *                 description: Fichier vidéo (MP4, WebM, MOV)
 *     responses:
 *       202:
 *         description: Vidéo reçue, transcodage en cours
 *       400:
 *         description: Erreur d'upload
 */
router.post('/video', uploadCourseContent.single('video'), handleMulterError, controller.uploadVideo);

/**
 * @swagger
 * /api/v1/uploads/{assetId}:
 *   get:
 *     summary: Suivre le statut d'un média uploadé (utile pour les vidéos en transcodage)
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statut du média
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/MediaAsset' }
 *       404:
 *         description: Média non trouvé
 */
router.get('/:assetId', controller.getAssetStatus);

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
router.post('/audio', uploadCourseContent.single('audio'), handleMulterError, controller.uploadAudio);

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
router.post('/pdf', uploadCourseContent.single('pdf'), handleMulterError, controller.uploadPdf);

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
router.post('/content', uploadCourseContent.single('content'), handleMulterError, controller.uploadContent);

module.exports = router;
