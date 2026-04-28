import './bootstrap-env.js';
import Fastify from 'fastify';
import { createWebSocketServer } from './server/ws-server.js';
import { initializeEngine, getEngineStats } from './engine.js';
import { checkDbConnection } from './lib/db.js';
import { logger } from './lib/logger.js';
import { warmHolidayCache } from '@paper-market/core';

// ═══════════════════════════════════════════════════════════
// 🚀 MARKET ENGINE: Entry Point
// ═══════════════════════════════════════════════════════════

const rawPort = process.env.PORT;
const PORT = Number(rawPort) || 3000;

// Track engine readiness for the health endpoint
let engineReady = false;
let engineError: string | null = null;
let shutdownStarted = false;

function formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

function registerProcessHandlers() {
    process.on('unhandledRejection', (reason) => {
        engineError = formatError(reason);
        logger.fatal({ err: reason }, 'Unhandled promise rejection');
    });

    process.on('uncaughtException', (error) => {
        engineError = formatError(error);
        logger.fatal({ err: error }, 'Uncaught exception');
    });
}

async function main() {
    logger.info('Starting Market Engine...');
    logger.info({ rawPort, resolvedPort: PORT }, 'Runtime port configuration');

    // ═══════════════════════════════════════════════════════════
    // 🌐 STEP 1: Start HTTP server IMMEDIATELY (Railway health check)
    // Engine init happens in the background AFTER the port is open.
    // ═══════════════════════════════════════════════════════════
    const fastify = Fastify({
        logger: false // Use our pino logger instead
    });

    // Attach websocket server to the same HTTP server/port.
    const wss = createWebSocketServer(fastify.server);

    fastify.get('/', async () => {
        return {
            status: 'ok',
            service: 'market-engine',
            engineReady,
            timestamp: new Date().toISOString()
        };
    });

    // Lightweight health — always returns 200 so Railway never kills us.
    // Engine readiness is surfaced via /stats, not here.
    fastify.get('/health', async () => {
        return { status: 'ok' };
    });

    fastify.get('/stats', async () => {
        return {
            engineReady,
            engineError,
            ...getEngineStats(),
        };
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    logger.info({ port: PORT }, "Server listening");
    logger.info({ host: '0.0.0.0', port: PORT }, 'HTTP + WebSocket server started');
    logger.info('✅ Market Engine is running');

    // ═══════════════════════════════════════════════════════════
    // 🛑 GRACEFUL SHUTDOWN
    // ═══════════════════════════════════════════════════════════
    const shutdown = async () => {
        if (shutdownStarted) return;
        shutdownStarted = true;
        logger.info('Shutting down...');
        wss.close();
        await fastify.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // ═══════════════════════════════════════════════════════════
    // 🏭 STEP 2: Initialize engine IN BACKGROUND after listen()
    // HTTP server is already accepting requests — Railway health passes.
    // ═══════════════════════════════════════════════════════════
    setImmediate(async () => {
        try {
            const dbOk = await checkDbConnection();
            if (!dbOk) {
                engineError = 'Database connection failed';
                logger.error('Database connection failed — engine not initialized');
                return;
            }

            // Pre-warm the Upstox holiday cache — non-fatal if it fails
            await warmHolidayCache().catch((err: unknown) =>
                logger.warn({ err }, 'Holiday cache warm-up failed; falling back to env vars')
            );

            await initializeEngine();
            engineReady = true;
            logger.info('✅ Market engine initialization complete');
        } catch (err) {
            engineError = err instanceof Error ? err.message : String(err);
            logger.error({ err }, 'Engine initialization failed');
        }
    });
}

registerProcessHandlers();

main().catch((error) => {
    engineError = formatError(error);
    logger.fatal({ err: error }, 'Fatal error');
    process.exit(1);
});
