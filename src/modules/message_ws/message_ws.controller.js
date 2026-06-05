const service = require('./message_ws.service');
const { createMessageSchema, supportMessageSchema } = require('./message_ws.schema');

const ADMIN_ROLES = ['admin', 'plateform_manager'];

async function create(req, res, next) {
  try {
    const { error, value } = createMessageSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const senderId    = req.user.id;
    const senderRole  = req.user.accountType;

    if (senderId === value.recipientId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer un message à vous-même' });
    }

    const recipient = await service.userExists(value.recipientId);
    if (!recipient) return res.status(404).json({ error: 'Destinataire introuvable' });

    // Un learner/parent ne peut écrire qu'à un admin ou plateform_manager
    const senderIsAdmin = ADMIN_ROLES.includes(senderRole);
    const recipientIsAdmin = ADMIN_ROLES.includes(recipient.accountType);
    if (!senderIsAdmin && !recipientIsAdmin) {
      return res.status(403).json({ error: 'Vous pouvez uniquement contacter le support (admin)' });
    }

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

// Permet à un learner de contacter le support sans connaître l'ID d'un admin
async function contactSupport(req, res, next) {
  try {
    const { error, value } = supportMessageSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    if (ADMIN_ROLES.includes(req.user.accountType)) {
      return res.status(400).json({ error: 'Les admins utilisent la messagerie directe' });
    }

    const senderId = req.user.id;

    // Chercher d'abord si le learner a déjà une conversation en cours avec un admin
    // pour continuer avec le même agent support
    const existingAdmin = await service.getExistingAdminContact(senderId);
    const admin = existingAdmin || await service.getDefaultAdmin();
    if (!admin) return res.status(503).json({ error: 'Aucun agent support disponible pour le moment' });

    const message = await service.createMessage({
      content: value.content,
      type: value.type,
      metadata: value.metadata,
      senderId,
      recipientId: admin.id,
    });
    if (req.io) {
      req.io.to(admin.id).emit('receive_message', message);
      req.io.to(senderId).emit('receive_message', message);
    }
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id du message requis' });

    const deleted = await service.deleteMessage(id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Message introuvable' });

    // Notifier les deux participants via WebSocket
    if (req.io) {
      req.io.to(deleted.recipientId).emit('message_deleted', { id });
      req.io.to(deleted.senderId).emit('message_deleted', { id });
    }

    res.json({ success: true, id });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres messages' });
    next(err);
  }
}

module.exports = { create, contactSupport, getConversation, getConversations, markAsRead, getUnreadCount, deleteMessage };
