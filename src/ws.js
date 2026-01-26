const { Server } = require('socket.io');
const { createMessageSchema } = require('./modules/message_ws/message_ws.schema');
const messageService = require('./modules/message_ws/message_ws.service');
const { createNotificationSchema } = require('./modules/notification/notification.schema');
const notificationService = require('./modules/notification/notification.service');

function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Authentification simplifiée (à adapter)
    const userId = socket.handshake.query.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(userId);

    socket.on('send_message', async (data) => {
      const { error, value } = createMessageSchema.validate(data);
      if (error) {
        socket.emit('error', { error: error.details[0].message });
        return;
      }
      // Stockage DB
      const message = await messageService.createMessage(value);
      // Envoi au destinataire (et à l'expéditeur)
      io.to(value.recipientId).emit('receive_message', message);
      io.to(value.senderId).emit('receive_message', message);
    });

    // Notification WebSocket
    socket.on('send_notification', async (data) => {
      const { error, value } = createNotificationSchema.validate(data);
      if (error) {
        socket.emit('error', { error: error.details[0].message });
        return;
      }
      // Stockage DB
      const notification = await notificationService.createNotification(value);
      // Envoi à l'utilisateur ciblé
      io.to(value.userId).emit('notification', notification);
    });
  });

  return io;
}

module.exports = setupWebSocket;
