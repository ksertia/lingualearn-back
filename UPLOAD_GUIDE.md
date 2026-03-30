# Endpoint d'Upload d'Images et Contenus

Ce projet supporte maintenant l'upload d'images et de contenus pour les cours.

## Endpoints disponibles

### 1. Upload d'Image
**Endpoint**: `POST /api/v1/courses/upload/image`

Upload une image pour une course (JPEG, PNG, GIF, WebP max 10MB)

**cURL exemple**:
```bash
curl -X POST http://localhost:4001/api/v1/courses/upload/image \
  -F "image=@/path/to/image.jpg"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "filename": "image-1234567890-abcdef.jpg",
    "url": "/uploads/image-1234567890-abcdef.jpg",
    "originalName": "image.jpg",
    "size": 125000,
    "mimetype": "image/jpeg"
  },
  "message": "Image uploadée avec succès"
}
```

### 2. Upload de Contenu
**Endpoint**: `POST /api/v1/courses/upload/content`

Upload un contenu (vidéo MP4/WebM, audio MP3/WAV, PDF max 100MB)

**cURL exemple**:
```bash
curl -X POST http://localhost:4001/api/v1/courses/upload/content \
  -F "content=@/path/to/video.mp4"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "filename": "video-1234567890-abcdef.mp4",
    "url": "/uploads/video-1234567890-abcdef.mp4",
    "originalName": "video.mp4",
    "size": 52000000,
    "mimetype": "video/mp4"
  },
  "message": "Contenu uploadé avec succès"
}
```

## Utilisation dans la création de cours

Après avoir uploadé une image ou un contenu, vous pouvez utiliser l'URL retournée pour créer un cours:

### Créer un cours avec image uploadée
```bash
curl -X POST http://localhost:4001/api/v1/courses \
  -H "Content-Type: application/json" \
  -d '{
    "stepId": "step123",
    "title": "Mon Cours",
    "description": "Description du cours",
    "contentType": "image",
    "contentUrl": "/uploads/image-1234567890-abcdef.jpg",
    "duration": 5,
    "isPublished": true
  }'
```

### Créer un cours avec vidéo uploadée
```bash
curl -X POST http://localhost:4001/api/v1/courses \
  -H "Content-Type: application/json" \
  -d '{
    "stepId": "step123",
    "title": "Mon Cours Vidéo",
    "description": "Description du cours",
    "contentType": "video",
    "contentUrl": "/uploads/video-1234567890-abcdef.mp4",
    "duration": 45,
    "isPublished": true
  }'
```

## Types de fichiers autorisés

### Images (max 10MB)
- image/jpeg
- image/png
- image/gif
- image/webp

### Contenus (max 100MB)
- Vidéos: video/mp4, video/webm
- Audio: audio/mpeg, audio/wav
- Documents: application/pdf

## Notes
- Les fichiers sont stockés dans le dossier `./uploads/`
- Chaque fichier reçoit un nom unique pour éviter les collisions
- Les URLs sont accessibles via le serveur web statiquement
