import { ModuleFunction } from '../types/workflow';
import { logger } from '../utils/logger';
import { WildberriesService } from '../services/WildberriesService';

export class ModuleRegistry {
  private modules = new Map<string, ModuleFunction>();
  private wbService: WildberriesService;

  constructor() {
    this.wbService = new WildberriesService();
    this.registerBuiltInModules();
  }

  register(name: string, module: ModuleFunction): void {
    if (this.modules.has(name)) {
      logger.warn(`Module ${name} is being overridden`);
    }
    
    this.modules.set(name, module);
    logger.info(`Module registered: ${name}`);
  }

  getModule(name: string): ModuleFunction | undefined {
    return this.modules.get(name);
  }

  getAllModules(): string[] {
    return Array.from(this.modules.keys());
  }

  unregister(name: string): boolean {
    const result = this.modules.delete(name);
    if (result) {
      logger.info(`Module unregistered: ${name}`);
    }
    return result;
  }

  private registerBuiltInModules(): void {
    // Wildberries API modules
    this.register('wb-get-campaigns', async (config: any) => {
      return this.wbService.getCampaigns(config);
    });

    this.register('wb-get-statistics', async (config: any) => {
      return this.wbService.getStatistics(config);
    });

    this.register('wb-get-keywords', async (config: any) => {
      return this.wbService.getKeywordsStatistics(config);
    });

    // Data processing modules
    this.register('data-filter', async (config: any, inputData: any) => {
      if (!Array.isArray(inputData)) {
        throw new Error('Data filter requires array input');
      }

      const { filters = [] } = config;
      
      return inputData.filter((item: any) => {
        return filters.every((filter: any) => {
          const { field, operator, value } = filter;
          const itemValue = this.getNestedValue(item, field);
          
          switch (operator) {
            case 'equals': return itemValue === value;
            case 'not_equals': return itemValue !== value;
            case 'contains': return String(itemValue).includes(String(value));
            case 'not_contains': return !String(itemValue).includes(String(value));
            case 'starts_with': return String(itemValue).startsWith(String(value));
            case 'ends_with': return String(itemValue).endsWith(String(value));
            case 'gt': return Number(itemValue) > Number(value);
            case 'gte': return Number(itemValue) >= Number(value);
            case 'lt': return Number(itemValue) < Number(value);
            case 'lte': return Number(itemValue) <= Number(value);
            case 'in': return Array.isArray(value) && value.includes(itemValue);
            case 'not_in': return Array.isArray(value) && !value.includes(itemValue);
            case 'is_null': return itemValue == null;
            case 'is_not_null': return itemValue != null;
            case 'regex': return new RegExp(value).test(String(itemValue));
            default: 
              logger.warn(`Unknown filter operator: ${operator}`);
              return true;
          }
        });
      });
    });

    this.register('metric-calculator', async (config: any, inputData: any) => {
      if (!Array.isArray(inputData)) {
        throw new Error('Metric calculator requires array input');
      }

      const { calculations = [] } = config;
      
      return inputData.map((item: any) => {
        const calculatedItem = { ...item };
        
        calculations.forEach((calc: any) => {
          try {
            const { name, formula, type = 'number' } = calc;
            
            // Safe expression evaluation
            const result = this.evaluateExpression(formula, item);
            calculatedItem[name] = this.formatResult(result, type);
            
          } catch (error) {
            logger.error(`Calculation error for ${calc.name}:`, error);
            calculatedItem[calc.name] = null;
          }
        });
        
        return calculatedItem;
      });
    });

    this.register('data-aggregator', async (config: any, inputData: any) => {
      if (!Array.isArray(inputData)) {
        throw new Error('Data aggregator requires array input');
      }

      const { groupBy, aggregations = [] } = config;
      
      if (!groupBy) {
        // No grouping, calculate aggregations for entire dataset
        return this.calculateAggregations(inputData, aggregations);
      }

      // Group data and calculate aggregations for each group
      const groups = this.groupBy(inputData, groupBy);
      const result = [];

      for (const [groupKey, groupData] of Object.entries(groups)) {
        const aggregated = this.calculateAggregations(groupData as any[], aggregations);
        result.push({
          [groupBy]: groupKey,
          ...aggregated,
          count: (groupData as any[]).length
        });
      }

      return result;
    });

    this.register('data-transformer', async (config: any, inputData: any) => {
      const { transformations = [] } = config;
      let result = inputData;

      for (const transformation of transformations) {
        const { type, config: transformConfig } = transformation;
        
        switch (type) {
          case 'rename_fields':
            result = this.renameFields(result, transformConfig.mappings);
            break;
          case 'add_computed_field':
            result = this.addComputedField(result, transformConfig);
            break;
          case 'remove_fields':
            result = this.removeFields(result, transformConfig.fields);
            break;
          case 'format_dates':
            result = this.formatDates(result, transformConfig);
            break;
          default:
            logger.warn(`Unknown transformation type: ${type}`);
        }
      }

      return result;
    });

    this.register('http-request', async (config: any, inputData: any) => {
      const { method = 'GET', url, headers = {}, body, timeout = 30000 } = config;
      
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    });

    this.register('delay', async (config: any, inputData: any) => {
      const { duration } = config;
      await new Promise(resolve => setTimeout(resolve, duration));
      return inputData;
    });

    logger.info(`Registered ${this.modules.size} built-in modules`);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateExpression(formula: string, context: any): any {
    // Simple and safe expression evaluator
    // Replace variable names with actual values
    let expression = formula;
    
    // Find all variable references (alphanumeric + underscore)
    const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
    
    for (const variable of variables) {
      const value = this.getNestedValue(context, variable);
      if (typeof value === 'number') {
        expression = expression.replace(new RegExp(`\\b${variable}\\b`, 'g'), value.toString());
      }
    }

    // Only allow mathematical operations
    if (!/^[0-9+\-*/.() ]+$/.test(expression)) {
      throw new Error('Invalid expression: only mathematical operations allowed');
    }

    return Function(`"use strict"; return (${expression})`)();
  }

  private formatResult(result: any, type: string): any {
    switch (type) {
      case 'integer': return Math.round(Number(result));
      case 'float': return Number(result);
      case 'percentage': return Number(result) * 100;
      case 'currency': return Number(result).toFixed(2);
      default: return result;
    }
  }

  private groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((groups, item) => {
      const groupKey = this.getNestedValue(item, key);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {});
  }

  private calculateAggregations(data: any[], aggregations: any[]): any {
    const result: any = {};
    
    aggregations.forEach(agg => {
      const { name, field, operation } = agg;
      const values = data.map(item => this.getNestedValue(item, field)).filter(v => v != null);
      
      switch (operation) {
        case 'sum':
          result[name] = values.reduce((sum, val) => sum + Number(val), 0);
          break;
        case 'avg':
          result[name] = values.length > 0 ? values.reduce((sum, val) => sum + Number(val), 0) / values.length : 0;
          break;
        case 'min':
          result[name] = values.length > 0 ? Math.min(...values.map(Number)) : 0;
          break;
        case 'max':
          result[name] = values.length > 0 ? Math.max(...values.map(Number)) : 0;
          break;
        case 'count':
          result[name] = values.length;
          break;
        case 'distinct_count':
          result[name] = new Set(values).size;
          break;
        default:
          logger.warn(`Unknown aggregation operation: ${operation}`);
          result[name] = 0;
      }
    });
    
    return result;
  }

  private renameFields(data: any, mappings: Record<string, string>): any {
    if (Array.isArray(data)) {
      return data.map(item => this.renameFields(item, mappings));
    }
    
    const result = { ...data };
    Object.entries(mappings).forEach(([oldName, newName]) => {
      if (oldName in result) {
        result[newName] = result[oldName];
        delete result[oldName];
      }
    });
    
    return result;
  }

  private addComputedField(data: any, config: any): any {
    const { name, formula } = config;
    
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        [name]: this.evaluateExpression(formula, item)
      }));
    }
    
    return {
      ...data,
      [name]: this.evaluateExpression(formula, data)
    };
  }

  private removeFields(data: any, fields: string[]): any {
    if (Array.isArray(data)) {
      return data.map(item => this.removeFields(item, fields));
    }
    
    const result = { ...data };
    fields.forEach(field => {
      delete result[field];
    });
    
    return result;
  }

  private formatDates(data: any, config: any): any {
    const { fields, format = 'YYYY-MM-DD' } = config;
    
    if (Array.isArray(data)) {
      return data.map(item => this.formatDates(item, config));
    }
    
    const result = { ...data };
    fields.forEach((field: string) => {
      if (result[field]) {
        result[field] = new Date(result[field]).toISOString().split('T')[0];
      }
    });
    
    return result;
  }
}
