export interface RetryPolicyOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class RetryPolicy {
  constructor(private options: RetryPolicyOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.options.maxRetries) {
          throw lastError;
        }

        const delay = Math.min(
          this.options.baseDelay * Math.pow(this.options.backoffFactor, attempt),
          this.options.maxDelay
        );

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
