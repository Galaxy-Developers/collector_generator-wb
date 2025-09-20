import 'dotenv/config';
import Fastify from 'fastify';
import pino from 'pino';
import { register, collectDefaultMetrics } from 'prom-client';
import config from './config.js';
import { registerRoutes } from './{{routesFile}}.js';
import {{errorClass}} from './errors/{{errorClass}}.js';

const logger = pino({
    level: config.logLevel,
    ...(process.env.NODE_ENV !== 'production' && {
        transport: { target: 'pino-pretty' }
    })
});

const app = Fastify({ logger });

collectDefaultMetrics();

// Health check
app.get('/health', async (req, reply) => {
    return { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: '{{serviceName}}',
        version: '{{version}}'
    };
});

// Prometheus metrics
app.get('/metrics', async (req, reply) => {
    reply.header('Content-Type', register.contentType);
    reply.send(await register.metrics());
});

app.setErrorHandler((error, request, reply) => {
    if (error instanceof {{errorClass}}) {
        request.log.warn(`{{errorClass}}: ${error.message} (Code: ${error.code})`);
        reply.status(error.statusCode).send({
            error: error.name,
            code: error.code,
            message: error.message,
            details: error.details
        });
    } else {
        request.log.error(error);
        reply.status(500).send({ 
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong.'
        });
    }
});

registerRoutes(app);

const start = async () => {
    try {
        await app.listen({ 
            port: config.port, 
            host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1' 
        });
        logger.info(`🚀 {{serviceName}} running on port ${config.port}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

start();