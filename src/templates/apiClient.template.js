import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {{errorClass}} from './errors/{{errorClass}}.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const httpsAgent = new https.Agent({ 
    rejectUnauthorized: true 
});

class {{clientName}} {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = config.api.baseUrl;
        {{#if rateLimit}}
        this.requestsPerMinute = config.api.rateLimit.requestsPerMinute;
        this.concurrentRequests = config.api.rateLimit.concurrentRequests;
        this.requestCount = 0;
        this.lastResetTime = Date.now();
        {{/if}}
    }
    
    {{#if rateLimit}}
    async rateLimitCheck() {
        const now = Date.now();
        if (now - this.lastResetTime >= 60000) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }
        
        if (this.requestCount >= this.requestsPerMinute) {
            const waitTime = 60000 - (now - this.lastResetTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.lastResetTime = Date.now();
        }
        
        this.requestCount++;
    }
    {{/if}}
    
    {{#each endpoints}}
    async {{name}}({{#if params}}{{#each params}}{{@key}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}) {
        {{#if ../rateLimit}}await this.rateLimitCheck();{{/if}}
        
        try {
            const response = await axios({
                method: '{{method}}',
                url: `${this.baseURL}{{path}}`,
                headers: {
                    {{#if ../authType}}
                    {{#eq ../authType "bearer"}}
                    'Authorization': `Bearer ${this.apiKey}`,
                    {{/eq}}
                    {{#eq ../authType "api_key"}}
                    '{{../authField}}': this.apiKey,
                    {{/eq}}
                    {{/if}}
                    'Content-Type': 'application/json'
                },
                {{#if params}}
                {{#eq method "GET"}}
                params: {
                    {{#each params}}
                    {{#if this}}{{@key}}{{/if}},
                    {{/each}}
                },
                {{/eq}}
                {{#eq method "POST"}}
                data: {
                    {{#each params}}
                    {{#if this}}{{@key}}{{/if}},
                    {{/each}}
                },
                {{/eq}}
                {{/if}}
                httpsAgent,
                timeout: 30000
            });
            
            return response.data;
        } catch (error) {
            console.error(`API Error in {{name}}:`, error.response?.data || error.message);
            throw new {{../errorClass}}(
                `Failed to fetch {{name}}: ${error.response?.data?.message || error.message}`,
                'API_ERROR',
                error.response?.status || 500
            );
        }
    }
    {{/each}}
}

export { {{clientName}} };