import { {{clientName}} } from './{{clientFile}}.js';
import { insertIntoBigQuery } from './{{bqClientFile}}.js';
import { Counter } from 'prom-client';

const requestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const {{dataMetric}} = new Counter({
    name: '{{metricName}}_total',
    help: 'Total number of {{description}} processed',
});

export function registerRoutes(app) {
    app.post('{{endpoint}}', async (request, reply) => {
        const start = Date.now();
        
        try {
            const { {{authField}}, {{#each requiredParams}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} } = request.body;
            
            if (!{{authField}}) {
                requestsTotal.inc({ method: 'POST', route: '{{endpoint}}', status_code: '400' });
                return reply.status(400).send({ error: '{{authField}} is required.' });
            }
            
            {{#if validation}}
            {{#each validation}}
            if ({{condition}}) {
                requestsTotal.inc({ method: 'POST', route: '{{../endpoint}}', status_code: '400' });
                return reply.status(400).send({ error: '{{message}}' });
            }
            {{/each}}
            {{/if}}
            
            app.log.info(`Processing request for {{endpoint}}`);
            
            const client = new {{clientName}}({{authField}});
            
            {{#each dataFlow}}
            const {{outputVar}} = await client.{{methodName}}({{#if params}}{{params}}{{/if}});
            {{#if saveToDb}}
            await insertIntoBigQuery({{outputVar}}, app.log);
            {{dataMetric}}.inc({{outputVar}}.length);
            {{/if}}
            {{/each}}
            
            requestsTotal.inc({ method: 'POST', route: '{{endpoint}}', status_code: '200' });
            
            const duration = Date.now() - start;
            return reply.send({
                success: true,
                {{#each responseFields}}
                {{name}}: {{value}},
                {{/each}}
                processing_time: duration
            });
            
        } catch (error) {
            app.log.error('Route error:', error);
            requestsTotal.inc({ method: 'POST', route: '{{endpoint}}', status_code: '500' });
            return reply.status(500).send({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
}