import { WildberriesService } from '../services/WildberriesService';
import { SocketService } from '../services/SocketService';
import { ModuleResult } from '../types/workflow';

export interface StatsModuleInput {
  authToken: string;
  campaignIds: number[];
  dateFrom: string;
  dateTo: string;
}

export interface CampaignStats {
  campaignId: number;
  date: string;
  views: number;
  clicks: number;
  ctr: number;
  cpc: number;
  sum: number;
  atbs: number;
  orders: number;
  cr: number;
  shks: number;
  sum_price: number;
}

export class WbGetStatsModule {
  private wbService: WildberriesService;
  private socketService: SocketService;

  constructor() {
    this.wbService = new WildberriesService();
    this.socketService = SocketService.getInstance();
  }

  async execute(input: StatsModuleInput): Promise<ModuleResult> {
    try {
      this.socketService.emitProgress('wb-get-stats', 'Получение статистики кампаний...');

      const stats = await this.wbService.getCampaignStats({
        token: input.authToken,
        campaignIds: input.campaignIds,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo
      });

      this.socketService.emitProgress('wb-get-stats', `Получено записей статистики: ${stats.length}`);

      return {
        success: true,
        data: {
          stats,
          count: stats.length,
          period: {
            from: input.dateFrom,
            to: input.dateTo
          },
          timestamp: new Date().toISOString()
        }
      };

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Unknown API error';

      this.socketService.emitError('wb-get-stats', errorMessage);

      return {
        success: false,
        error: {
          message: errorMessage,
          code: error?.response?.status || 'UNKNOWN',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
