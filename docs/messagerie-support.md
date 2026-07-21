# Système de Messagerie Support — LinguaLearn

## Règles métier

| Qui envoie | À qui | Résultat |
|-----------|-------|----------|
| Learner / parent | Admin / plateform_manager | ✅ Autorisé |
| Learner / parent | Autre learner | ❌ 403 Refusé |
| Admin | N'importe qui | ✅ Autorisé |

---

## 1. Learner contacte le support

```http
POST /api/v1/messages-ws/support
Authorization: Bearer <token_learner>
Content-Type: application/json

{
  "content": "Bonjour, j'ai un problème avec mon abonnement"
}
```

**Réponse :**
```json
{
  "id": "msg_xxx",
  "content": "Bonjour, j'ai un problème...",
  "senderId": "id_learner",
  "recipientId": "id_admin",
  "sender": { "username": "EDU-...", "accountType": "learner" },
  "recipient": { "username": "admin", "accountType": "admin" }
}
```

> Le système retrouve automatiquement le même admin pour les messages suivants.

---

## 2. Learner continue la conversation

Continuer à appeler `/support` — l'admin précédent est retrouvé automatiquement.

```http
POST /api/v1/messages-ws/support
Authorization: Bearer <token_learner>
Content-Type: application/json

{
  "content": "Merci pour votre réponse, mais..."
}
```

---

## 3. Admin répond au learner

```http
POST /api/v1/messages-ws
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "recipientId": "id_learner",
  "content": "Bonjour, nous allons résoudre votre problème"
}
```

---

## 4. Liste des conversations

```http
GET /api/v1/messages-ws/conversations
Authorization: Bearer <token>
```

- **Learner** → ses conversations uniquement
- **Admin** → toutes les conversations de la plateforme

---

## 5. Historique paginé d'une conversation

```http
GET /api/v1/messages-ws/conversation?userA=id_learner&userB=id_admin&page=1&limit=30
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "total": 42,
  "page": 1,
  "limit": 30,
  "items": [ ... ]
}
```

---

## 6. Marquer les messages comme lus

À appeler quand l'utilisateur ouvre une conversation.

```http
PUT /api/v1/messages-ws/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "senderId": "id_de_lexpéditeur"
}
```

---

## 7. Nombre de messages non lus (badge)

```http
GET /api/v1/messages-ws/unread-count
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "unreadCount": 3
}
```

---

## 8. WebSocket — Événements temps réel

### Connexion
```js
const socket = io('https://votre-serveur.com', {
  auth: { token: '<access_token>' }
});

// Rejoindre sa room (userId)
socket.emit('join', userId);
```

### Écouter les nouveaux messages
```js
socket.on('receive_message', (message) => {
  console.log('Nouveau message reçu :', message);
});
```

### Écouter la confirmation de lecture
```js
socket.on('messages_read', ({ by }) => {
  console.log('Messages lus par :', by);
});
```

---

## Flux complet

```
Learner                        Serveur                        Admin
   |                              |                              |
   |-- POST /support ------------>|                              |
   |                              |-- WebSocket receive_message->|
   |<-- { message + recipientId }-|                              |
   |                              |                              |
   |                              |<-- POST / { recipientId } ---|
   |<-- WebSocket receive_message-|                              |
   |                              |                              |
   |-- PUT /read { senderId } --->|                              |
   |                              |-- WebSocket messages_read -->|
```
