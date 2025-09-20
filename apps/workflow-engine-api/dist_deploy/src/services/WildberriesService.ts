import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

export class WildberriesService {
  private baseURL = 'https://advert-api.wb.ru';

  async getCampaigns(config: any): Promise<any> {
    try {
      const response: AxiosResponse = await axios.get(\`\${this.baseURL}/adv/v1/promotion/count\`, {
        headers: {
          'Authorization': config.token,
          'Content-Type': 'application/json'
        }
      });
      return response.data || [];
    } catch (error: any) {
      logger.error('Failed to fetch WB campaigns', { error: error?.message, config });
      throw new Error(\`Failed to fetch campaigns: \${error?.message || 'Unknown error'}\`);
    }
  }

  async getCampaignStats(config: any): Promise<any> {
    try {
      const response: AxiosResponse = await axios.post(\`\${this.baseURL}/adv/v2/fullstats\`, {
        campaigns: config.campaignIds,
        interval: {
          begin: config.dateFrom,
          end: config.dateTo
        }
      }, {
        headers: {
          'Authorization': config.token,
          'Content-Type': 'application/json'
        }
      });
      return response.data || [];
    } catch (error: any) {
      logger.error('Failed to fetch WB statistics', { error: error?.message, config });
      throw new Error(\`Failed to fetch stats: \${error?.message || 'Unknown error'}\`);
    }
  }
}
