import { BigQuery } from '@google-cloud/bigquery';
import config from '../config.js';
import {{errorClass}} from './errors/{{errorClass}}.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bigquery = new BigQuery({ 
    projectId: config.gcpProjectId 
});

export const insertIntoBigQuery = async ({{dataParam}}, log) => {
    if ({{dataParam}}.length === 0) return;
    
    const rows = {{dataParam}}.map(item => {
        const processedAt = new Date().toISOString();
        return {
            {{#each schemaMapping}}
            {{target}}: {{source}},
            {{/each}}
            processed_at: processedAt,
            partition_date: {{partitionField}}
        };
    });

    const dataset = bigquery.dataset(config.bigQuery.datasetId);
    const table = dataset.table(config.bigQuery.tableId);

    // Create temporary file for batch loading (FREE TIER!)
    const tempFilePath = path.join(__dirname, '../temp', `batch_${Date.now()}.json`);
    
    try {
        // Ensure temp directory exists
        const tempDir = path.dirname(tempFilePath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Write data to temporary file
        fs.writeFileSync(tempFilePath, rows.map(row => JSON.stringify(row)).join('\
'));
        
        // Load data from file (batch loading is free!)
        const [job] = await table.load(tempFilePath, {
            sourceFormat: 'NEWLINE_DELIMITED_JSON',
            createDisposition: 'CREATE_IF_NEEDED',
            writeDisposition: 'WRITE_APPEND',
            schema: {
                fields: [
                    {{#each bigQuerySchema}}
                    { name: '{{name}}', type: '{{type}}', mode: '{{mode}}' },
                    {{/each}}
                ]
            }
        });

        console.log(`Job ${job.id} completed.`);
        log?.info(`Successfully loaded ${rows.length} rows into BigQuery`);
        
    } catch (error) {
        console.error('BigQuery insertion error:', error);
        throw new {{errorClass}}('Failed to insert data into BigQuery', 'BIGQUERY_ERROR', 500);
    } finally {
        // Cleanup temporary file
        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', cleanupError);
        }
    }
};