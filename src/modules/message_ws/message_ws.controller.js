const service = require('./message_ws.service');
const { createMessageSchema } = require('./message_ws.schema');

async function create(req, res, next) {
  try {
    const { error, value } = createMessageSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // senderId = utilisateur authentifié (non falsifiable)
    const senderId = req.user.id;

    if (senderId === value.recipientId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer un message à vous-même' });
    }

    const recipient = await service.userExists(value.recipientId);
    if (!recipient) return res.status(404).json({ error: 'Destinataire introuvable' });

    const message = await service.createMessage({ ...value, senderId });
    if (req.io) {
      req.io.to(value.recipientId).emit('receive_message', message);
      req.io.to(senderId).emit('receive_message', message);
    }
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const { userA, userB } = req.query;
    if (!userA || !userB) return res.status(400).json({ error: 'userA et userB sont requis' });

    // Un user normal ne peut lire que ses propres conversations
    const { id: userId, accountType } = req.user;
    const isAdmin = ['admin', 'plateform_manager'].includes(accountType);
    if (!isAdmin && userId !== userA && userId !== userB) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const result = await service.getMessagesBetweenUsers(userA, userB, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getConversations(req, res, next) {
  try {
    const { id: userId, accountType } = req.user;
    const conversations = await service.getConversations(userId, accountType);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { senderId } = req.body;
    const recipientId = req.user.id;
    if (!senderId) return res.status(400).json({ error: 'senderId requis' });
    await service.markMessagesAsRead(senderId, recipientId);
    if (req.io) req.io.to(senderId).emit('messages_read', { by: recipientId });
    res.json({ message: 'Messages marqués comme lus.' });
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await service.getUnreadCount(req.user.id);
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getConversation, getConversations, markAsRead, getUnreadCount };
