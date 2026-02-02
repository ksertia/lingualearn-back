const discoverService = require('./discover.service');

exports.getLanguages = async (req, res, next) => {
  try {
    const languages = await discoverService.getLanguagesForDiscover();
    res.json(languages);
  } catch (err) {
    next(err);
  }
};

exports.getExercises = async (req, res, next) => {
  try {
    const exercises = await discoverService.getExercisesForDiscover();
    res.json(exercises);
  } catch (err) {
    next(err);
  }
};
