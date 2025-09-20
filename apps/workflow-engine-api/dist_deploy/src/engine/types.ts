
import { BigQueryService } from '../services/BigQueryService'; // Добавлено

// Карта с данными, которые приходят на входы узла
export type ExecutionInputs = Map<string, any>;
// Карта с данными, которые узел отдает на своих выходах
export type ExecutionOutputs = Map<string, any>;

// Результат работы одного узла
export interface ExecutionResult {
    outputs: ExecutionOutputs;
    error?: string;
}

// Интерфейс, которому должен соответствовать каждый наш модуль
export interface IModuleExecutor {
    // bigQueryService добавлен как обязательный параметр!
    execute(config: unknown, inputs: ExecutionInputs, apiKey: string, bigQueryService: BigQueryService): Promise<ExecutionResult>;
}

