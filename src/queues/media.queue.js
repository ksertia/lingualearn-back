const { Queue } = require('bullmq');
const { connection } = require('../config/queueConnection');

const QUEUE_NAME = 'media-processing';

const mediaQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 24 * 60 * 60 }, // garde 24h pour debug puis auto-nettoyage
        removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
});

// jobPayload: { assetId, mediaType, tmpFilePath, originalName, mimeType }
async function enqueueMediaJob(jobPayload) {
    await mediaQueue.add(jobPayload.mediaType, jobPayload, {
        jobId: jobPayload.assetId,
    });
}

module.exports = { QUEUE_NAME, mediaQueue, enqueueMediaJob };
