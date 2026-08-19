const fs = require('fs');
const { prisma } = require('../../config/prisma');
const { moveToFinalStorage, mediaTypeFromMime } = require('../../utils/uploadService');
const { enqueueMediaJob } = require('../../queues/media.queue');

// Traite un upload léger (image/audio/pdf) : déplacement synchrone, prêt immédiatement.
async function handleSyncUpload(req, res, mediaType) {
    if (!req.file) {
        return res.status(400).json({ success: false, message: `Aucun fichier ${mediaType} fourni` });
    }
    try {
        const { filename, url } = moveToFinalStorage(req.file.path, mediaType, req.file.originalname);
        const asset = await prisma.mediaAsset.create({
            data: {
                mediaType,
                status: 'ready',
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                url,
            },
        });
        res.status(200).json({
            success: true,
            data: { assetId: asset.id, filename, url, status: 'ready', originalName: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype },
            message: `${mediaType} uploadé avec succès`,
        });
    } catch (error) {
        fs.unlink(req.file.path, () => {});
        res.status(500).json({ success: false, message: error.message || `Erreur lors de l'upload ${mediaType}` });
    }
}

const uploadImage = (req, res) => handleSyncUpload(req, res, 'image');
const uploadAudio = (req, res) => handleSyncUpload(req, res, 'audio');
const uploadPdf   = (req, res) => handleSyncUpload(req, res, 'pdf');

// Vidéo : mise en queue pour transcodage HLS en arrière-plan par le worker.
const uploadVideo = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier vidéo fourni' });
    }
    try {
        const asset = await prisma.mediaAsset.create({
            data: {
                mediaType: 'video',
                status: 'processing',
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
            },
        });

        await enqueueMediaJob({
            assetId: asset.id,
            mediaType: 'video',
            tmpFilePath: req.file.path,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
        });

        res.status(202).json({
            success: true,
            data: { assetId: asset.id, status: 'processing' },
            message: 'Vidéo reçue, transcodage HLS en cours. Consultez GET /uploads/:assetId pour suivre l\'avancement.',
        });
    } catch (error) {
        fs.unlink(req.file.path, () => {});
        res.status(500).json({ success: false, message: error.message || 'Erreur lors de la mise en file de la vidéo' });
    }
};

// Contenu générique : dispatch selon le mimetype réel.
const uploadContent = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier de contenu fourni' });
    }
    const mediaType = mediaTypeFromMime(req.file.mimetype);
    if (mediaType === 'video') return uploadVideo(req, res);
    if (mediaType) return handleSyncUpload(req, res, mediaType);

    fs.unlink(req.file.path, () => {});
    res.status(400).json({ success: false, message: `Type de fichier non supporté: ${req.file.mimetype}` });
};

const getAssetStatus = async (req, res, next) => {
    try {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.assetId } });
        if (!asset) return res.status(404).json({ success: false, message: 'Média non trouvé' });
        res.status(200).json({ success: true, data: asset });
    } catch (err) { next(err); }
};

module.exports = {
    uploadImage,
    uploadContent,
    uploadVideo,
    uploadAudio,
    uploadPdf,
    getAssetStatus,
};
