require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Worker } = require('bullmq');
const { connection } = require('./config/queueConnection');
const { QUEUE_NAME } = require('./queues/media.queue');
const { prisma } = require('./config/prisma');
const { hlsDir } = require('./utils/uploadService');
const { logger } = require('./utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

process.on('uncaughtException', (err) => {
    logger.error(`[worker] uncaughtException: ${err.message}`);
});
process.on('unhandledRejection', (reason) => {
    logger.error(`[worker] unhandledRejection: ${reason}`);
});

// Transcode en HLS avec 3 profils de qualité (adaptive bitrate) via une master
// playlist — le lecteur bascule automatiquement selon la bande passante.
function transcodeToHls(inputPath, outputDir) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(outputDir, { recursive: true });

        const variants = [
            { name: '360p', size: '640x360', videoBitrate: '600k', audioBitrate: '96k' },
            { name: '480p', size: '842x480', videoBitrate: '1200k', audioBitrate: '128k' },
            { name: '720p', size: '1280x720', videoBitrate: '2500k', audioBitrate: '128k' },
        ];

        const command = ffmpeg(inputPath);

        variants.forEach((v) => {
            command
                .output(path.join(outputDir, `${v.name}.m3u8`))
                .videoCodec('libx264')
                .audioCodec('aac')
                .size(v.size)
                .videoBitrate(v.videoBitrate)
                .audioBitrate(v.audioBitrate)
                .outputOptions([
                    '-hls_time', '6',
                    '-hls_playlist_type', 'vod',
                    '-hls_segment_filename', path.join(outputDir, `${v.name}_%03d.ts`),
                    '-preset', 'veryfast',
                ]);
        });

        command
            .on('error', reject)
            .on('end', () => {
                const masterPlaylist = [
                    '#EXTM3U',
                    '#EXT-X-VERSION:3',
                    ...variants.flatMap((v) => [
                        `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(v.videoBitrate) * 1000},RESOLUTION=${v.size.replace('x', 'x')}`,
                        `${v.name}.m3u8`,
                    ]),
                ].join('\n');
                fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterPlaylist);
                resolve();
            })
            .run();
    });
}

async function processVideoJob(job) {
    const { assetId, tmpFilePath } = job.data;
    const outputDir = path.join(hlsDir, assetId);

    try {
        await transcodeToHls(tmpFilePath, outputDir);

        await prisma.mediaAsset.update({
            where: { id: assetId },
            data: { status: 'ready', url: `/media/hls/${assetId}/master.m3u8` },
        });

        fs.unlink(tmpFilePath, () => {});
        logger.info(`[worker] Vidéo transcodée en HLS: ${assetId}`);
    } catch (err) {
        await prisma.mediaAsset.update({
            where: { id: assetId },
            data: { status: 'failed', errorMessage: err.message?.slice(0, 2000) },
        }).catch(() => {});
        fs.rm(outputDir, { recursive: true, force: true }, () => {});
        throw err;
    }
}

const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
        if (job.name === 'video') return processVideoJob(job);
        throw new Error(`Type de job média non supporté: ${job.name}`);
    },
    { connection, concurrency: 1 } // transcodage CPU-intensif — un seul à la fois
);

worker.on('completed', (job) => logger.info(`[worker] Job ${job.id} terminé`));
worker.on('failed', (job, err) => logger.error(`[worker] Job ${job?.id} échoué: ${err.message}`));

logger.info('[worker] Worker de traitement média démarré, en attente de jobs...');
