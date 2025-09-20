import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load GCP Project ID from key.json
let gcpProjectIdFromKey = null;
try {
    const keyPath = path.join(__dirname, '../config/key.json');
    if (fs.existsSync(keyPath)) {
        const keyContent = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        gcpProjectIdFromKey = keyContent.project_id;
    } else {
        console.error(`Key file not found at ${keyPath}. Exiting.`);
        process.exit(1);
    }
} catch (error) {
    console.error('Error reading key.json:', error.message);
    process.exit(1);
}

const client = new SecretManagerServiceClient();

async function getSecret(name) {
    const projectId = gcpProjectIdFromKey;
    if (!projectId) {
        throw new Error('GCP_PROJECT_ID not found in key.json.');
    }
    
    const version = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${name}/versions/latest`,
    });
    return version[0].payload.data.toString();
}

let loadedSecrets = {};

export const config = {
    port: process.env.PORT || {{port}},
    gcpProjectId: gcpProjectIdFromKey,
    
    bigQuery: {
        datasetId: '{{datasetId}}',
        tableId: process.env.BIGQUERY_TABLE_ID || '{{tableId}}'
    },
    
    api: {
        baseUrl: '{{apiBaseUrl}}',
        authType: '{{authType}}',
        {{#if rateLimit}}
        rateLimit: {
            requestsPerMinute: {{rateLimit.requestsPerMinute}},
            concurrentRequests: {{rateLimit.concurrentRequests}}
        },
        {{/if}}
        {{#if pagination}}
        pagination: {
            type: '{{pagination.type}}',
            pageSize: {{pagination.pageSize}}
        }
        {{/if}}
    },
    
    logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;