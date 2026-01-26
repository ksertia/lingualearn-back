const service = require('./message_ws.service');
const { createMessageSchema } = require('./message_ws.schema');

async function create(req, res, next) {
  try {
    const { error, value } = createMessageSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const message = await service.createMessage(value);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const { userA, userB } = req.query;
    if (!userA || !userB) return res.status(400).json({ error: 'userA and userB are required' });
    const messages = await service.getMessagesBetweenUsers(userA, userB);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getConversation
};
