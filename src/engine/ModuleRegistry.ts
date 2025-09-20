import { ModuleFunction } from '../types/workflow';
import { logger } from '../utils/logger';

export class ModuleRegistry {
  private modules: Map<string, ModuleFunction> = new Map();

  registerModule(name: string, moduleFunction: ModuleFunction): void {
    this.modules.set(name, moduleFunction);
    logger.info('Module registered: ' + name);
  }

  async executeModule(name: string, input: any): Promise<any> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error('Module not found: ' + name);
    }

    return module(input);
  }

  getRegisteredModules(): string[] {
    return Array.from(this.modules.keys());
  }

  async loadRemoteModule(url: string): Promise<void> {
    try {
      logger.info('Mock loading remote module: ' + url);
      // Mock implementation
    } catch (error: any) {
      const errorMsg = error && error.message ? error.message : 'Unknown error';
      logger.error('Failed to load remote module: ' + errorMsg);
      throw error;
    }
  }
}
