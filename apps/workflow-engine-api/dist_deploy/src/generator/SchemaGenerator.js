export class SchemaGenerator {
    constructor() {
        this.typeMapping = {
            'string': 'STRING',
            'integer': 'INTEGER', 
            'number': 'FLOAT',
            'boolean': 'BOOLEAN',
            'date': 'DATE',
            'datetime': 'TIMESTAMP',
            'timestamp': 'TIMESTAMP',
            'json': 'JSON',
            'object': 'JSON',
            'array': 'JSON'
        };
    }
    
    /**
     * Генерация BigQuery схем из конфигурации
     */
    generateSchemas(config) {
        const schemas = {};
        
        // Основная схема из конфигурации
        const mainSchema = this.processSchema(config.bigquery_config.schema);
        schemas[config.bigquery_config.table_id] = mainSchema;
        
        // Дополнительные схемы если есть множественные таблицы
        if (config.bigquery_config.tables) {
            Object.keys(config.bigquery_config.tables).forEach(tableName => {
                const tableConfig = config.bigquery_config.tables[tableName];
                if (tableConfig.schema) {
                    schemas[tableName] = this.processSchema(tableConfig.schema);
                }
            });
        }
        
        // Автоматическая генерация схем из API endpoints
        if (config.api_config.endpoints) {
            config.api_config.endpoints.forEach(endpoint => {
                const autoSchema = this.generateSchemaFromEndpoint(endpoint);
                if (autoSchema.length > 0) {
                    schemas[`${endpoint.name}_auto`] = autoSchema;
                }
            });
        }
        
        return schemas;
    }
    
    /**
     * Обработка схемы с валидацией и дополнениями
     */
    processSchema(schema) {
        const processedSchema = schema.map(field => this.processField(field));
        
        // Добавляем системные поля если их нет
        const systemFields = ['processed_at', 'partition_date'];
        
        systemFields.forEach(fieldName => {
            const exists = processedSchema.find(f => f.name === fieldName);
            if (!exists) {
                if (fieldName === 'processed_at') {
                    processedSchema.push({
                        name: 'processed_at',
                        type: 'TIMESTAMP',
                        mode: 'REQUIRED',
                        description: 'Timestamp when record was processed'
                    });
                } else if (fieldName === 'partition_date') {
                    processedSchema.push({
                        name: 'partition_date', 
                        type: 'DATE',
                        mode: 'REQUIRED',
                        description: 'Date partition for data organization'
                    });
                }
            }
        });
        
        return processedSchema;
    }
    
    /**
     * Обработка отдельного поля схемы
     */
    processField(field) {
        const processed = {
            name: field.name,
            type: this.normalizeType(field.type),
            mode: field.mode || 'NULLABLE'
        };
        
        // Добавляем описание если есть
        if (field.description) {
            processed.description = field.description;
        }
        
        // Специальная обработка для RECORD типов
        if (processed.type === 'RECORD' && field.fields) {
            processed.fields = field.fields.map(subField => this.processField(subField));
        }
        
        return processed;
    }
    
    /**
     * Нормализация типов данных
     */
    normalizeType(type) {
        const normalizedType = type.toUpperCase();
        
        // Проверяем допустимые BigQuery типы
        const validTypes = [
            'STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 
            'TIMESTAMP', 'DATE', 'TIME', 'DATETIME',
            'JSON', 'BYTES', 'RECORD', 'GEOGRAPHY'
        ];
        
        if (validTypes.includes(normalizedType)) {
            return normalizedType;
        }
        
        // Пытаемся найти соответствие в mapping
        const mappedType = this.typeMapping[type.toLowerCase()];
        if (mappedType) {
            return mappedType;
        }
        
        // По умолчанию возвращаем STRING
        console.warn(`Unknown type '${type}', defaulting to STRING`);
        return 'STRING';
    }
    
    /**
     * Автоматическая генерация схемы из API endpoint
     */
    generateSchemaFromEndpoint(endpoint) {
        const schema = [];
        
        // Добавляем поля на основе параметров endpoint
        if (endpoint.params) {
            Object.keys(endpoint.params).forEach(paramName => {
                const paramType = endpoint.params[paramName];
                
                schema.push({
                    name: paramName,
                    type: this.normalizeType(paramType),
                    mode: 'NULLABLE',
                    description: `Parameter from ${endpoint.name} endpoint`
                });
            });
        }
        
        // Добавляем общие поля для API response
        const commonFields = [
            { name: 'response_id', type: 'STRING', mode: 'NULLABLE' },
            { name: 'endpoint_name', type: 'STRING', mode: 'REQUIRED' },
            { name: 'raw_response', type: 'JSON', mode: 'NULLABLE' },
            { name: 'response_timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ];
        
        return [...schema, ...commonFields];
    }
    
    /**
     * Валидация схемы
     */
    validateSchema(schema) {
        const errors = [];
        
        if (!Array.isArray(schema) || schema.length === 0) {
            errors.push('Schema must be a non-empty array');
            return { valid: false, errors };
        }
        
        const fieldNames = new Set();
        
        schema.forEach((field, index) => {
            // Проверяем обязательные свойства поля
            if (!field.name) {
                errors.push(`Field at index ${index} missing name`);
            }
            
            if (!field.type) {
                errors.push(`Field '${field.name || index}' missing type`);
            }
            
            // Проверяем уникальность имен
            if (fieldNames.has(field.name)) {
                errors.push(`Duplicate field name: ${field.name}`);
            }
            fieldNames.add(field.name);
            
            // Проверяем корректность типа
            if (field.type && !this.isValidBigQueryType(field.type)) {
                errors.push(`Invalid BigQuery type '${field.type}' for field '${field.name}'`);
            }
            
            // Проверяем режим поля
            if (field.mode && !['NULLABLE', 'REQUIRED', 'REPEATED'].includes(field.mode)) {
                errors.push(`Invalid mode '${field.mode}' for field '${field.name}'`);
            }
            
            // Проверяем вложенные поля для RECORD типа
            if (field.type === 'RECORD') {
                if (!field.fields || !Array.isArray(field.fields)) {
                    errors.push(`RECORD field '${field.name}' must have fields array`);
                } else {
                    const nestedValidation = this.validateSchema(field.fields);
                    if (!nestedValidation.valid) {
                        errors.push(...nestedValidation.errors.map(err => 
                            `In RECORD '${field.name}': ${err}`
                        ));
                    }
                }
            }
        });
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Проверка валидности BigQuery типа
     */
    isValidBigQueryType(type) {
        const validTypes = [
            'STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 
            'TIMESTAMP', 'DATE', 'TIME', 'DATETIME',
            'JSON', 'BYTES', 'RECORD', 'GEOGRAPHY'
        ];
        
        return validTypes.includes(type.toUpperCase());
    }
    
    /**
     * Генерация SQL DDL для создания таблицы
     */
    generateTableDDL(tableName, schema, partitionField = null) {
        const fields = schema.map(field => this.fieldToSQL(field));
        
        let ddl = `CREATE TABLE \`${tableName}\` (\
`;
        ddl += fields.join(',\
');
        ddl += '\
)';
        
        // Добавляем партиционирование если указано
        if (partitionField) {
            ddl += `\
PARTITION BY DATE(${partitionField})`;
        }
        
        return ddl;
    }
    
    /**
     * Преобразование поля в SQL формат
     */
    fieldToSQL(field, indent = '  ') {
        let sql = `${indent}\`${field.name}\` ${field.type}`;
        
        if (field.mode === 'REQUIRED') {
            sql += ' NOT NULL';
        }
        
        if (field.mode === 'REPEATED') {
            sql = `${indent}\`${field.name}\` ARRAY<${field.type}>`;
        }
        
        if (field.type === 'RECORD' && field.fields) {
            const subFields = field.fields.map(sf => this.fieldToSQL(sf, indent + '  '));
            sql = `${indent}\`${field.name}\` STRUCT<\
`;
            sql += subFields.join(',\
');
            sql += `\
${indent}>`;
            
            if (field.mode === 'REPEATED') {
                sql = `${indent}\`${field.name}\` ARRAY<STRUCT<\
`;
                sql += subFields.join(',\
');
                sql += `\
${indent}>>`;
            }
        }
        
        return sql;
    }
}