import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export class ConfigValidator {
    constructor() {
        this.ajv = new Ajv({ allErrors: true });
        addFormats(this.ajv);
        
        this.schema = {
            type: 'object',
            required: ['collector_name', 'api_config', 'bigquery_config'],
            properties: {
                collector_name: {
                    type: 'string',
                    pattern: '^[a-z][a-z0-9-]*$',
                    minLength: 3,
                    maxLength: 50
                },
                description: {
                    type: 'string',
                    maxLength: 500
                },
                api_config: {
                    type: 'object',
                    required: ['base_url', 'auth_type', 'endpoints'],
                    properties: {
                        base_url: {
                            type: 'string',
                            format: 'uri'
                        },
                        auth_type: {
                            type: 'string',
                            enum: ['bearer', 'api_key', 'basic', 'oauth']
                        },
                        auth_field: {
                            type: 'string'
                        },
                        endpoints: {
                            type: 'array',
                            minItems: 1,
                            items: {
                                type: 'object',
                                required: ['name', 'path', 'method'],
                                properties: {
                                    name: {
                                        type: 'string',
                                        pattern: '^[a-zA-Z][a-zA-Z0-9_]*$'
                                    },
                                    path: {
                                        type: 'string',
                                        pattern: '^/'
                                    },
                                    method: {
                                        type: 'string',
                                        enum: ['GET', 'POST', 'PUT', 'DELETE']
                                    },
                                    params: {
                                        type: 'object'
                                    }
                                }
                            }
                        },
                        rate_limits: {
                            type: 'object',
                            properties: {
                                requests_per_minute: {
                                    type: 'integer',
                                    minimum: 1,
                                    maximum: 1000
                                },
                                concurrent_requests: {
                                    type: 'integer',
                                    minimum: 1,
                                    maximum: 50
                                }
                            }
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['offset', 'cursor', 'page']
                                },
                                page_size: {
                                    type: 'integer',
                                    minimum: 1,
                                    maximum: 10000
                                }
                            }
                        }
                    }
                },
                bigquery_config: {
                    type: 'object',
                    required: ['dataset_id', 'table_id', 'schema'],
                    properties: {
                        dataset_id: {
                            type: 'string',
                            pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
                        },
                        table_id: {
                            type: 'string',
                            pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
                        },
                        partition_field: {
                            type: 'string'
                        },
                        schema: {
                            type: 'array',
                            minItems: 1,
                            items: {
                                type: 'object',
                                required: ['name', 'type'],
                                properties: {
                                    name: {
                                        type: 'string',
                                        pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
                                    },
                                    type: {
                                        type: 'string',
                                        enum: ['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'TIMESTAMP', 'DATE', 'JSON']
                                    },
                                    mode: {
                                        type: 'string',
                                        enum: ['NULLABLE', 'REQUIRED', 'REPEATED'],
                                        default: 'NULLABLE'
                                    }
                                }
                            }
                        }
                    }
                },
                data_processing: {
                    type: 'object',
                    properties: {
                        transformations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['field', 'target', 'type'],
                                properties: {
                                    field: { type: 'string' },
                                    target: { type: 'string' },
                                    type: {
                                        type: 'string',
                                        enum: ['map', 'transform', 'filter', 'aggregate']
                                    },
                                    config: { type: 'object' }
                                }
                            }
                        },
                        filters: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['field', 'operator', 'value'],
                                properties: {
                                    field: { type: 'string' },
                                    operator: {
                                        type: 'string',
                                        enum: ['equals', 'not_equals', 'contains', 'greater', 'less']
                                    },
                                    value: {}
                                }
                            }
                        }
                    }
                },
                deployment_config: {
                    type: 'object',
                    properties: {
                        port: {
                            type: 'integer',
                            minimum: 1024,
                            maximum: 65535
                        },
                        log_level: {
                            type: 'string',
                            enum: ['debug', 'info', 'warn', 'error']
                        },
                        health_check_path: {
                            type: 'string',
                            pattern: '^/'
                        },
                        metrics_path: {
                            type: 'string', 
                            pattern: '^/'
                        }
                    }
                }
            }
        };
        
        this.validate = this.ajv.compile(this.schema);
    }
    
    /**
     * Валидация конфигурации коллектора
     */
    validate(config) {
        const valid = this.validate(config);
        
        if (!valid) {
            return {
                valid: false,
                errors: this.validate.errors.map(error => 
                    `${error.instancePath || 'root'}: ${error.message}`
                )
            };
        }
        
        // Дополнительная бизнес-валидация
        const businessValidation = this.validateBusinessRules(config);
        
        if (!businessValidation.valid) {
            return businessValidation;
        }
        
        return { valid: true, errors: [] };
    }
    
    /**
     * Дополнительная бизнес-валидация
     */
    validateBusinessRules(config) {
        const errors = [];
        
        // Проверяем уникальность имен endpoints
        const endpointNames = config.api_config.endpoints.map(e => e.name);
        const uniqueNames = new Set(endpointNames);
        if (endpointNames.length !== uniqueNames.size) {
            errors.push('Endpoint names must be unique');
        }
        
        // Проверяем уникальность имен полей в BigQuery схеме
        const fieldNames = config.bigquery_config.schema.map(f => f.name);
        const uniqueFields = new Set(fieldNames);
        if (fieldNames.length !== uniqueFields.size) {
            errors.push('BigQuery schema field names must be unique');
        }
        
        // Проверяем, что partition_field существует в схеме
        if (config.bigquery_config.partition_field) {
            const partitionFieldExists = config.bigquery_config.schema.some(
                field => field.name === config.bigquery_config.partition_field
            );
            if (!partitionFieldExists) {
                errors.push(`Partition field '${config.bigquery_config.partition_field}' not found in schema`);
            }
        }
        
        // Проверяем корректность трансформаций
        if (config.data_processing?.transformations) {
            for (const transform of config.data_processing.transformations) {
                const targetFieldExists = config.bigquery_config.schema.some(
                    field => field.name === transform.target
                );
                if (!targetFieldExists) {
                    errors.push(`Transformation target field '${transform.target}' not found in BigQuery schema`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Получение схемы валидации в JSON формате
     */
    getSchema() {
        return this.schema;
    }
    
    /**
     * Получение примера валидной конфигурации
     */
    getExampleConfig() {
        return {
            collector_name: 'wb-feedback-collector',
            description: 'Wildberries feedback data collector',
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
                            'skip': 'integer'
                        }
                    }
                ],
                rate_limits: {
                    requests_per_minute: 60,
                    concurrent_requests: 5
                }
            },
            bigquery_config: {
                dataset_id: 'wildberries_data',
                table_id: 'feedbacks',
                partition_field: 'partition_date',
                schema: [
                    { name: 'feedback_id', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'text', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'rating', type: 'INTEGER', mode: 'NULLABLE' },
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