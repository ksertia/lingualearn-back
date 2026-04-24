const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createMessageSchema } = require('./modules/message_ws/message_ws.schema');
const messageService = require('./modules/message_ws/message_ws.service');
const { createNotificationSchema } = require('./modules/notification/notification.schema');
const notificationService = require('./modules/notification/notification.service');

let ioInstance = null;

function getIo() {
  return ioInstance;
}

function setupWebSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Auth JWT middleware WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Token manquant'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      // Fallback mode dev : accepter userId direct (sans token)
      const userId = socket.handshake.query?.userId;
      if (userId) {
        socket.userId = userId;
        return next();
      }
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(userId);

    // ── Envoyer un message ────────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      const { error, value } = createMessageSchema.validate(data);
      if (error) {
        socket.emit('error', { error: error.details[0].message });
        return;
      }
      try {
        const message = await messageService.createMessage(value);
        io.to(value.recipientId).emit('receive_message', message);
        io.to(value.senderId).emit('receive_message', message);
      } catch (err) {
        socket.emit('error', { error: err.message });
      }
    });

    // ── Typing indicator ──────────────────────────────────────────────────────
    socket.on('typing', ({ recipientId }) => {
      io.to(recipientId).emit('user_typing', { senderId: userId });
    });

    socket.on('stop_typing', ({ recipientId }) => {
      io.to(recipientId).emit('user_stop_typing', { senderId: userId });
    });

    // ── Marquer messages comme lus ────────────────────────────────────────────
    socket.on('mark_read', async ({ senderId }) => {
      try {
        await messageService.markMessagesAsRead(senderId, userId);
        io.to(senderId).emit('messages_read', { by: userId });
      } catch (err) {
        socket.emit('error', { error: err.message });
      }
    });

    // ── Envoyer une notification ──────────────────────────────────────────────
    socket.on('send_notification', async (data) => {
      const { error, value } = createNotificationSchema.validate(data);
      if (error) {
        socket.emit('error', { error: error.details[0].message });
        return;
      }
      try {
        const notification = await notificationService.createNotification(value);
        io.to(value.userId).emit('notification', notification);
      } catch (err) {
        socket.emit('error', { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      socket.leave(userId);
    });
  });

  ioInstance = io;
  return io;
}

module.exports = setupWebSocket;
module.exports.getIo = getIo;
