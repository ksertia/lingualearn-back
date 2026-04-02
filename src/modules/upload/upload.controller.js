const { getFileUrl } = require('../../utils/uploadService');

// Upload image handler
const uploadImage = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Aucun fichier image fourni',
			});
		}

		const imageUrl = getFileUrl(req.file.filename);

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: imageUrl,
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

		const contentUrl = getFileUrl(req.file.filename);

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: contentUrl,
				originalName: req.file.originalname,
				size: req.file.size,
				mimetype: req.file.mimetype,
			},
			message: 'Contenu uploadé avec succès',
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message || 'Erreur lors de l\'upload du contenu',
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

		const videoUrl = getFileUrl(req.file.filename);

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: videoUrl,
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

		const audioUrl = getFileUrl(req.file.filename);

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: audioUrl,
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

		const pdfUrl = getFileUrl(req.file.filename);

		res.status(200).json({
			success: true,
			data: {
				filename: req.file.filename,
				url: pdfUrl,
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
