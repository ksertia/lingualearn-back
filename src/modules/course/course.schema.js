const Joi = require('joi');

const createCourseSchema = Joi.object({
	title: Joi.string().max(200).required(),
	description: Joi.string().allow('', null),
	isPublished: Joi.boolean().default(false),
	trackId: Joi.string().allow('', null),
	// Ajoute ici d'autres champs nécessaires à ton modèle
});

module.exports = {
	createCourseSchema
};
