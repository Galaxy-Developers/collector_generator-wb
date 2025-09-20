import fs from 'fs';
import chalk from 'chalk';
import { ConfigValidator } from '../generator/ConfigValidator.js';

export class ValidateCommand {
    constructor() {
        this.validator = new ConfigValidator();
    }
    
    async execute(configPath, options) {
        // Show schema if requested
        if (options.schema) {
            this.showSchema();
            return;
        }
        
        // Show example if requested
        if (options.example) {
            this.showExample();
            return;
        }
        
        // Validate configuration file
        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }
        
        console.log(chalk.cyan(`🔍 Validating configuration: ${configPath}\
`));
        
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            
            const result = this.validator.validate(config);
            
            if (result.valid) {
                console.log(chalk.green('✅ Configuration is valid!\
'));
                this.showConfigSummary(config);
            } else {
                console.log(chalk.red('❌ Configuration validation failed:\
'));
                result.errors.forEach((error, index) => {
                    console.log(`${chalk.red(`${index + 1}.`)} ${error}`);
                });
                console.log('');
                process.exit(1);
            }
            
        } catch (parseError) {
            if (parseError instanceof SyntaxError) {
                throw new Error(`Invalid JSON in configuration file: ${parseError.message}`);
            }
            throw parseError;
        }
    }
    
    showSchema() {
        console.log(chalk.cyan('📋 Configuration Schema:\
'));
        
        const schema = this.validator.getSchema();
        console.log(JSON.stringify(schema, null, 2));
    }
    
    showExample() {
        console.log(chalk.cyan('📝 Example Configuration:\
'));
        
        const example = this.validator.getExampleConfig();
        console.log(JSON.stringify(example, null, 2));
        
        console.log(chalk.gray('\
Save this as collector-config.json and run:'));
        console.log(chalk.gray('collector-gen generate collector-config.json'));
    }
    
    showConfigSummary(config) {
        console.log(chalk.cyan('📊 Configuration Summary:\
'));
        
        // Basic info
        console.log(`${chalk.bold('Collector Name:')} ${config.collector_name}`);
        if (config.description) {
            console.log(`${chalk.bold('Description:')} ${config.description}`);
        }
        
        // API Configuration
        console.log(`\
${chalk.bold('API Configuration:')}`);
        console.log(`  Base URL: ${config.api_config.base_url}`);
        console.log(`  Auth Type: ${config.api_config.auth_type}`);
        console.log(`  Endpoints: ${config.api_config.endpoints.length}`);
        
        config.api_config.endpoints.forEach((endpoint, index) => {
            console.log(`    ${index + 1}. ${endpoint.method} ${endpoint.path} (${endpoint.name})`);
        });
        
        if (config.api_config.rate_limits) {
            console.log(`  Rate Limits: ${config.api_config.rate_limits.requests_per_minute}/min, ${config.api_config.rate_limits.concurrent_requests} concurrent`);
        }
        
        // BigQuery Configuration
        console.log(`\
${chalk.bold('BigQuery Configuration:')}`);
        console.log(`  Dataset: ${config.bigquery_config.dataset_id}`);
        console.log(`  Table: ${config.bigquery_config.table_id}`);
        console.log(`  Schema Fields: ${config.bigquery_config.schema.length}`);
        
        if (config.bigquery_config.partition_field) {
            console.log(`  Partition Field: ${config.bigquery_config.partition_field}`);
        }
        
        // Data Processing
        if (config.data_processing) {
            console.log(`\
${chalk.bold('Data Processing:')}`);
            
            if (config.data_processing.transformations) {
                console.log(`  Transformations: ${config.data_processing.transformations.length}`);
            }
            
            if (config.data_processing.filters) {
                console.log(`  Filters: ${config.data_processing.filters.length}`);
            }
        }
        
        // Deployment Configuration
        if (config.deployment_config) {
            console.log(`\
${chalk.bold('Deployment Configuration:')}`);
            console.log(`  Port: ${config.deployment_config.port || 8080}`);
            console.log(`  Log Level: ${config.deployment_config.log_level || 'info'}`);
        }
        
        console.log(chalk.green('\
🎉 Ready for generation!'));
        console.log(chalk.gray(`Run: collector-gen generate <config-file>`));
    }
}