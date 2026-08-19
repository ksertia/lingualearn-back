const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Racine de stockage local — tout ce qui est servi publiquement vit sous storage/uploads
const storageRoot = path.join(__dirname, '../../storage/uploads');
const tmpDir    = path.join(storageRoot, 'tmp');
const imagesDir = path.join(storageRoot, 'images');
const videosDir = path.join(storageRoot, 'videos');
const audiosDir = path.join(storageRoot, 'audios');
const pdfsDir   = path.join(storageRoot, 'pdfs');
const hlsDir    = path.join(storageRoot, 'hls');

[storageRoot, tmpDir, imagesDir, videosDir, audiosDir, pdfsDir, hlsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function uniqueFilename(originalname) {
    const ext = path.extname(originalname);
    const suffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    return `${suffix}${ext}`;
}

// Tous les uploads passent d'abord par tmp/ — le worker (ou le controller pour
// les images/pdf, traités synchroniquement car légers) déplace ensuite vers le
// dossier final. Ça garantit qu'un fichier partiellement écrit n'est jamais
// exposé sous une URL publique.
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tmpDir),
    filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname)),
});

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
const PDF_MIMES   = ['application/pdf'];

const fileFilter = (req, file, cb) => {
    const allowed = [...IMAGE_MIMES, ...VIDEO_MIMES, ...AUDIO_MIMES, ...PDF_MIMES];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Le type de fichier ${file.mimetype} n'est pas autorisé`), false);
};

const uploadCourseContent = multer({
    storage,
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max — vidéos pédagogiques
});

const uploadImage = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Seuls les fichiers image (JPEG, PNG, GIF, WebP) sont autorisés'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
});

function mediaTypeFromMime(mimetype) {
    if (IMAGE_MIMES.includes(mimetype)) return 'image';
    if (VIDEO_MIMES.includes(mimetype)) return 'video';
    if (AUDIO_MIMES.includes(mimetype)) return 'audio';
    if (PDF_MIMES.includes(mimetype)) return 'pdf';
    return null;
}

// Déplace un fichier léger (image/pdf) de tmp/ vers son dossier final et
// retourne l'URL publique — traitement synchrone, pas besoin de job.
function moveToFinalStorage(tmpPath, mediaType, originalname) {
    const targetDir = { image: imagesDir, pdf: pdfsDir, audio: audiosDir }[mediaType];
    const filename = uniqueFilename(originalname);
    const finalPath = path.join(targetDir, filename);
    fs.renameSync(tmpPath, finalPath);
    return { filename, url: `/media/${mediaType === 'image' ? 'images' : mediaType === 'pdf' ? 'pdfs' : 'audios'}/${filename}` };
}

module.exports = {
    storageRoot, tmpDir, imagesDir, videosDir, audiosDir, pdfsDir, hlsDir,
    uploadCourseContent, uploadImage,
    mediaTypeFromMime, moveToFinalStorage,
};
