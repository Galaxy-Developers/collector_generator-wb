import { logger } from '../utils/logger';

// Import real WB SDK modules
import { DefaultApi as PromotionApi } from '@galaxy-wb-sdk/promotion';
import { DefaultApi as AnalyticsApi } from '@galaxy-wb-sdk/analytics';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { RetryPolicy } from '../utils/retryPolicy';

export class WildberriesService {
  private promotionApi: PromotionApi;
  private analyticsApi: AnalyticsApi;
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;

  constructor() {
    // Initialize WB SDK APIs
    this.promotionApi = new PromotionApi({
      basePath: process.env.WB_API_BASE_URL,
      apiKey: process.env.WB_API_KEY
    });
    
    this.analyticsApi = new AnalyticsApi({
      basePath: process.env.WB_ANALYTICS_BASE_URL,
      apiKey: process.env.WB_API_KEY
    });

    // Initialize circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 10000
    });

    // Initialize retry policy
    this.retryPolicy = new RetryPolicy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    });
  }

  async getCampaigns(config: any): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      return this.retryPolicy.execute(async () => {
        try {
          logger.info('Fetching WB campaigns', { config });
          
          const response = await this.promotionApi.advV1AdvertsGet({
            type: config.type || 4, // Search campaigns
            status: config.status || 9, // Active campaigns  
            limit: config.limit || 100
          });

          logger.info('Successfully fetched WB campaigns', { 
            count: response.data?.length || 0 
          });

          return {
            campaigns: response.data || [],
            totalCount: response.data?.length || 0,
            fetchedAt: new Date().toISOString()
          };

        } catch (error) {
          logger.error('Failed to fetch WB campaigns', { error: error.message, config });
          
          // Handle rate limiting
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] || 60;
            logger.warn(`Rate limited, waiting ${retryAfter} seconds`);
            await this.wait(retryAfter * 1000);
            throw new Error(`Rate limited, retry after ${retryAfter} seconds`);
          }
          
          throw error;
        }
      });
    });
  }

  async getStatistics(config: any): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      return this.retryPolicy.execute(async () => {
        try {
          logger.info('Fetching WB statistics', { config });

          const { campaignIds, dateFrom, dateTo } = config;
          
          const statsPromises = campaignIds.map(async (campaignId: number) => {
            const response = await this.promotionApi.advV1StatsPost([{
              id: campaignId,
              interval: {
                begin: dateFrom,
                end: dateTo
              }
            }]);
            return response.data;
          });

          const allStats = await Promise.all(statsPromises);
          
          logger.info('Successfully fetched WB statistics', { 
            campaignCount: campaignIds.length,
            statsCount: allStats.length
          });

          return {
            statistics: allStats.flat(),
            period: { from: dateFrom, to: dateTo },
            campaignIds,
            fetchedAt: new Date().toISOString()
          };

        } catch (error) {
          logger.error('Failed to fetch WB statistics', { error: error.message, config });
          
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] || 60;
            await this.wait(retryAfter * 1000);
            throw new Error(`Rate limited, retry after ${retryAfter} seconds`);
          }
          
          throw error;
        }
      });
    });
  }

  async getKeywordsStatistics(config: any): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      return this.retryPolicy.execute(async () => {
        try {
          const { campaignId, dateFrom, dateTo } = config;
          
          const response = await this.promotionApi.advV1StatWordsGet(
            campaignId,
            dateFrom,
            dateTo
          );

          return {
            keywords: response.data?.stat || [],
            campaignId,
            period: { from: dateFrom, to: dateTo },
            fetchedAt: new Date().toISOString()
          };

        } catch (error) {
          logger.error('Failed to fetch WB keywords statistics', { error: error.message, config });
          throw error;
        }
      });
    });
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Simple API call to check connectivity
      await this.promotionApi.advV1ConfigGet();
      return true;
    } catch (error) {
      logger.error('WB API health check failed', error);
      return false;
    }
  }
}
