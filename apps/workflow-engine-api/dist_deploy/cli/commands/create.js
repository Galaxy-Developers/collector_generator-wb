import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigValidator } from '../generator/ConfigValidator.js';

export class CreateCommand {
    constructor() {
        this.validator = new ConfigValidator();
        this.presets = {
            'wb-feedback': {
                name: 'WB Feedback Collector',
                config: {
                    api_config: {
                        base_url: 'https://feedbacks-api.wildberries.ru',
                        auth_type: 'bearer',
                        auth_field: 'wbApiToken',
                        endpoints: [
                            {
                                name: 'feedbacks',
                                path: '/api/v1/feedbacks',
                                method: 'GET',
                                params: {
                                    'isAnswered': 'boolean',
                                    'take': 'integer',
                                    'skip': 'integer',
                                    'nmId': 'string'
                                }
                            }
                        ],
                        rate_limits: {
                            requests_per_minute: 60,
                            concurrent_requests: 5
                        }
                    },
                    bigquery_config: {
                        dataset_id: 'wildberries_feedback',
                        schema: [
                            { name: 'feedback_id', type: 'STRING', mode: 'NULLABLE' },
                            { name: 'nmid', type: 'INTEGER', mode: 'NULLABLE' },
                            { name: 'text', type: 'STRING', mode: 'NULLABLE' },
                            { name: 'rating', type: 'INTEGER', mode: 'NULLABLE' },
                            { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
                            { name: 'partition_date', type: 'DATE', mode: 'REQUIRED' }
                        ]
                    }
                }
            },
            
            'wb-analytics': {
                name: 'WB Analytics Collector',
                config: {
                    api_config: {
                        base_url: 'https://statistics-api.wildberries.ru',
                        auth_type: 'bearer',
                        auth_field: 'wbApiToken',
                        endpoints: [
                            {
                                name: 'incomes',
                                path: '/api/v1/supplier/incomes',
                                method: 'GET',
                                params: {
                                    'dateFrom': 'string',
                                    'dateTo': 'string'
                                }
                            }
                        ],
                        rate_limits: {
                            requests_per_minute: 100,
                            concurrent_requests: 10
                        }
                    },
                    bigquery_config: {
                        dataset_id: 'wildberries_analytics',
                        schema: [
                            { name: 'income_id', type: 'INTEGER', mode: 'NULLABLE' },
                            { name: 'nm_id', type: 'INTEGER', mode: 'NULLABLE' },
                            { name: 'date', type: 'DATE', mode: 'NULLABLE' },
                            { name: 'quantity', type: 'INTEGER', mode: 'NULLABLE' },
                            { name: 'partition_date', type: 'DATE', mode: 'REQUIRED' }
                        ]
                    }
                }
            },
            
            'generic-rest': {
                name: 'Generic REST API Collector',
                config: {
                    api_config: {
                        base_url: 'https://api.example.com',
                        auth_type: 'api_key',
                        auth_field: 'x-api-key',
                        endpoints: [
                            {
                                name: 'data',
                                path: '/api/v1/data',
                                method: 'GET',
                                params: {
                                    'page': 'integer',
                                    'limit': 'integer'
                                }
                            }
                        ],
                        rate_limits: {
                            requests_per_minute: 120,
                            concurrent_requests: 5
                        }
                    },
                    bigquery_config: {
                        dataset_id: 'generic_api_data',
                        schema: [
                            { name: 'id', type: 'STRING', mode: 'NULLABLE' },
                            { name: 'data', type: 'JSON', mode: 'NULLABLE' },
                            { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
                            { name: 'partition_date', type: 'DATE', mode: 'REQUIRED' }
                        ]
                    }
                }
            }
        };
    }
    
    async execute(options) {
        console.log(chalk.cyan('🎨 Interactive Collector Configuration Creator\
'));
        
        let config;
        
        // Если preset не указан или interactive mode отключен
        if (options.noInteractive) {
            if (options.preset && this.presets[options.preset]) {
                config = this.createFromPreset(options.preset);
            } else {
                config = this.validator.getExampleConfig();
            }
        } else {
            config = await this.interactiveCreation(options);
        }
        
        // Валидация созданной конфигурации
        const validationResult = this.validator.validate(config);
        
        if (!validationResult.valid) {
            console.log(chalk.red('❌ Generated configuration is invalid:\
'));
            validationResult.errors.forEach(error => {
                console.log(`  ${chalk.red('•')} ${error}`);
            });
            throw new Error('Configuration validation failed');
        }
        
        // Сохранение конфигурации
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
        
        console.log(chalk.green(`\
✅ Configuration saved to: ${outputPath}`));
        console.log(chalk.cyan('\
🚀 Next steps:'));
        console.log(`   collector-gen generate ${outputPath}`);
    }
    
    async interactiveCreation(options) {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'preset',
                message: 'Choose a preset to start with:',
                choices: [
                    ...Object.keys(this.presets).map(key => ({
                        name: `${this.presets[key].name} (${key})`,
                        value: key
                    })),
                    { name: 'Custom configuration', value: 'custom' }
                ]
            }
        ]);
        
        let config;
        
        if (answers.preset !== 'custom') {
            config = this.createFromPreset(answers.preset);
            
            // Спрашиваем, хочет ли пользователь кастомизировать
            const customize = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'customize',
                    message: 'Do you want to customize this preset?',
                    default: false
                }
            ]);
            
            if (customize.customize) {
                config = await this.customizeConfig(config);
            }
        } else {
            config = await this.createCustomConfig();
        }
        
        return config;
    }
    
    createFromPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }
        
        console.log(chalk.green(`\
📦 Using preset: ${preset.name}`));
        
        return {
            collector_name: `${presetName}-collector`,
            description: `Generated ${preset.name}`,
            ...preset.config,
            deployment_config: {
                port: 8080,
                log_level: 'info',
                health_check_path: '/health',
                metrics_path: '/metrics'
            }
        };
    }
    
    async customizeConfig(baseConfig) {
        console.log(chalk.cyan('\
🔧 Customizing configuration...\
'));
        
        const customization = await inquirer.prompt([
            {
                type: 'input',
                name: 'collector_name',
                message: 'Collector name:',
                default: baseConfig.collector_name,
                validate: (input) => {
                    if (!input.match(/^[a-z][a-z0-9-]*$/)) {
                        return 'Name must start with letter and contain only lowercase letters, numbers, and dashes';
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description:',
                default: baseConfig.description
            },
            {
                type: 'input',
                name: 'base_url',
                message: 'API Base URL:',
                default: baseConfig.api_config.base_url,
                validate: (input) => {
                    try {
                        new URL(input);
                        return true;
                    } catch {
                        return 'Please enter a valid URL';
                    }
                }
            },
            {
                type: 'list',
                name: 'auth_type',
                message: 'Authentication type:',
                choices: ['bearer', 'api_key', 'basic', 'oauth'],
                default: baseConfig.api_config.auth_type
            },
            {
                type: 'input',
                name: 'dataset_id',
                message: 'BigQuery Dataset ID:',
                default: baseConfig.bigquery_config.dataset_id
            },
            {
                type: 'input',
                name: 'table_id',
                message: 'BigQuery Table ID:',
                default: baseConfig.bigquery_config.table_id || 'default_table'
            },
            {
                type: 'number',
                name: 'port',
                message: 'Service port:',
                default: baseConfig.deployment_config?.port || 8080
            }
        ]);
        
        return {
            ...baseConfig,
            collector_name: customization.collector_name,
            description: customization.description,
            api_config: {
                ...baseConfig.api_config,
                base_url: customization.base_url,
                auth_type: customization.auth_type
            },
            bigquery_config: {
                ...baseConfig.bigquery_config,
                dataset_id: customization.dataset_id,
                table_id: customization.table_id
            },
            deployment_config: {
                ...baseConfig.deployment_config,
                port: customization.port
            }
        };
    }
    
    async createCustomConfig() {
        console.log(chalk.cyan('\
🎨 Creating custom configuration...\
'));
        
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'collector_name',
                message: 'Collector name:',
                validate: (input) => {
                    if (!input.match(/^[a-z][a-z0-9-]*$/)) {
                        return 'Name must start with letter and contain only lowercase letters, numbers, and dashes';
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description:'
            },
            {
                type: 'input',
                name: 'base_url',
                message: 'API Base URL:',
                validate: (input) => {
                    try {
                        new URL(input);
                        return true;
                    } catch {
                        return 'Please enter a valid URL';
                    }
                }
            },
            {
                type: 'list',
                name: 'auth_type',
                message: 'Authentication type:',
                choices: ['bearer', 'api_key', 'basic', 'oauth']
            },
            {
                type: 'input',
                name: 'auth_field',
                message: 'Authentication field name:',
                default: (answers) => {
                    return answers.auth_type === 'bearer' ? 'authorization' : 
                           answers.auth_type === 'api_key' ? 'x-api-key' : 'auth';
                }
            },
            {
                type: 'input',
                name: 'dataset_id',
                message: 'BigQuery Dataset ID:'
            },
            {
                type: 'input',
                name: 'table_id', 
                message: 'BigQuery Table ID:'
            }
        ]);
        
        return {
            collector_name: answers.collector_name,
            description: answers.description,
            api_config: {
                base_url: answers.base_url,
                auth_type: answers.auth_type,
                auth_field: answers.auth_field,
                endpoints: [
                    {
                        name: 'data',
                        path: '/api/v1/data',
                        method: 'GET',
                        params: {}
                    }
                ],
                rate_limits: {
                    requests_per_minute: 60,
                    concurrent_requests: 5
                }
            },
            bigquery_config: {
                dataset_id: answers.dataset_id,
                table_id: answers.table_id,
                partition_field: 'partition_date',
                schema: [
                    { name: 'id', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'data', type: 'JSON', mode: 'NULLABLE' },
                    { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
                    { name: 'partition_date', type: 'DATE', mode: 'REQUIRED' }
                ]
            },
            deployment_config: {
                port: 8080,
                log_level: 'info',
                health_check_path: '/health',
                metrics_path: '/metrics'
            }
        };
    }
}