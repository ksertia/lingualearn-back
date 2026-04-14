const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Créer les dossiers d'upload temporaires
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

// Upload vers Cloudinary
const uploadToCloudinary = (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'lingualearn',
      resource_type: options.resource_type || 'auto',
      ...options
    }, (error, result) => {
      // Supprimer le fichier temporaire local
      fs.unlink(filePath, () => {});
      if (error) return reject(error);
      resolve(result);
    });
  });
};

// Générer l'URL du fichier (maintenant via Cloudinary)
const getFileUrl = (cloudinaryUrl) => {
  return cloudinaryUrl;
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
  uploadToCloudinary,
  getFileUrl,
  getUploadedFile
};
