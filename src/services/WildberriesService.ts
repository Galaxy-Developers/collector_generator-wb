import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

export class WildberriesService {
  private baseURL = 'https://advert-api.wb.ru';

  async getCampaigns(config: any): Promise<any> {
    try {
      const url = this.baseURL + '/adv/v1/promotion/count';
      const response: AxiosResponse = await axios.get(url, {
        headers: {
          'Authorization': config.token,
          'Content-Type': 'application/json'
        }
      });
      return response.data || [];
    } catch (error: any) {
      const errorMsg = error && error.message ? error.message : 'Unknown error';
      logger.error('Failed to fetch WB campaigns', { error: errorMsg, config });
      throw new Error('Failed to fetch campaigns: ' + errorMsg);
    }
  }

  async getCampaignStats(config: any): Promise<any> {
    try {
      const url = this.baseURL + '/adv/v2/fullstats';
      const response: AxiosResponse = await axios.post(url, {
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
      const errorMsg = error && error.message ? error.message : 'Unknown error';
      logger.error('Failed to fetch WB statistics', { error: errorMsg, config });
      throw new Error('Failed to fetch stats: ' + errorMsg);
    }
  }
}
