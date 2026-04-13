const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Créer les dossiers d'upload s'ils n'existent pas
const uploadsDir = path.join(__dirname, '../../uploads');
const coursesDir = path.join(uploadsDir, 'courses');
const imagesDir = path.join(uploadsDir, 'images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(coursesDir)) {
  fs.mkdirSync(coursesDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configuration de stockage pour multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Déterminer le dossier selon le type de fichier
    let dir = coursesDir;
    
    if (file.mimetype.startsWith('image/')) {
      dir = imagesDir;
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtrer les fichiers autorisés
const fileFilter = (req, file, cb) => {
  // Types MIME autorisés
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Le type de fichier ${file.mimetype} n'est pas autorisé`), false);
  }
};

// Créer les middlewares multer
const uploadCourseContent = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

const uploadImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image (JPEG, PNG, GIF, WebP) sont autorisés'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max pour les images
  }
});

// Générer l'URL du fichier uploadé
const getFileUrl = (filename) => {
  return `/uploads/images/${filename.includes('-') && filename.includes('.') ? filename : filename}`;
};

// Obtenir le chemin relatif du fichier uploadé
const getUploadedFile = (filename) => {
  return {
    filename,
    url: getFileUrl(filename),
    path: path.join(uploadsDir, filename)
  };
};

module.exports = {
  uploadCourseContent,
  uploadImage,
  getFileUrl,
  getUploadedFile
};
