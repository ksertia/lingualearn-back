const Joi = require('joi');

// Accepte une URL absolue (contenu externe) ou un chemin local servi par notre
// propre serveur (/media/... — images, HLS, audio, pdf stockés sur le serveur
// depuis la refonte du stockage local, plus de dépendance à Cloudinary).
function mediaUrl() {
  return Joi.alternatives(
    Joi.string().uri(),
    Joi.string().pattern(/^\/media\//)
  );
}

module.exports = { mediaUrl };
