const { uploadToCloudinary } = require('../../utils/uploadService');

// Upload image handler
const uploadImage = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Aucun fichier image fourni',
			});
		}

		const result = await uploadToCloudinary(req.file.path, {
			folder: 'lingualearn/images',
			resource_type: 'image'
		});

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: result.secure_url,
				publicId: result.public_id,
				originalName: req.file.originalname,
				size: req.file.size,
				mimetype: req.file.mimetype,
			},
			message: 'Image uploadée avec succès',
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message || 'Erreur lors de l\'upload de l\'image',
		});
	}
};

// Upload content handler (vidéo, audio, PDF)
const uploadContent = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Aucun fichier de contenu fourni',
			});
		}

		const resourceType = req.file.mimetype.startsWith('video/') ? 'video'
			: req.file.mimetype.startsWith('audio/') ? 'video'
			: 'raw';

		const result = await uploadToCloudinary(req.file.path, {
			folder: 'lingualearn/content',
			resource_type: resourceType
		});

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: result.secure_url,
				publicId: result.public_id,
				originalName: req.file.originalname,
				size: req.file.size,
				mimetype: req.file.mimetype,
			},
			message: 'Contenu uploadé avec succès',
		});
	} catch (error) {
		console.error('Erreur upload content:', error);
		res.status(500).json({
			success: false,
			message: error.message || 'Erreur lors de l\'upload du contenu',
			error: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};

// Upload video handler
const uploadVideo = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Aucun fichier vidéo fourni',
			});
		}

		const result = await uploadToCloudinary(req.file.path, {
			folder: 'lingualearn/videos',
			resource_type: 'video'
		});

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: result.secure_url,
				publicId: result.public_id,
				originalName: req.file.originalname,
				size: req.file.size,
				mimetype: req.file.mimetype,
			},
			message: 'Vidéo uploadée avec succès',
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message || 'Erreur lors de l\'upload de la vidéo',
		});
	}
};

// Upload audio handler
const uploadAudio = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Aucun fichier audio fourni',
			});
		}

		const result = await uploadToCloudinary(req.file.path, {
			folder: 'lingualearn/audios',
			resource_type: 'video'
		});

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: result.secure_url,
				publicId: result.public_id,
				originalName: req.file.originalname,
				size: req.file.size,
				mimetype: req.file.mimetype,
			},
			message: 'Audio uploadé avec succès',
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message || 'Erreur lors de l\'upload de l\'audio',
		});
	}
};

// Upload PDF handler
const uploadPdf = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Aucun fichier PDF fourni',
			});
		}

		const result = await uploadToCloudinary(req.file.path, {
			folder: 'lingualearn/pdfs',
			resource_type: 'raw'
		});

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: result.secure_url,
				publicId: result.public_id,
				originalName: req.file.originalname,
				size: req.file.size,
				mimetype: req.file.mimetype,
			},
			message: 'PDF uploadé avec succès',
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message || 'Erreur lors de l\'upload du PDF',
		});
	}
};

module.exports = {
	uploadImage,
	uploadContent,
	uploadVideo,
	uploadAudio,
	uploadPdf,
};
