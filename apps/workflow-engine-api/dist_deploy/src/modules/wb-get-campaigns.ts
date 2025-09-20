import { WildberriesService } from '../services/WildberriesService';
import { SocketService } from '../services/SocketService';
import { ModuleResult } from '../types/workflow';

export interface CampaignsModuleInput {
  authToken: string;
  filters?: {
    status?: 'active' | 'paused' | 'ended';
    type?: number;
  };
}

export interface Campaign {
  campaignId: number;
  name: string;
  status: string;
  type: number;
  created: string;
  updated: string;
  dailyBudget: number;
  budget: number;
}

export class WbGetCampaignsModule {
  private wbService: WildberriesService;
  private socketService: SocketService;

  constructor() {
    this.wbService = new WildberriesService();
    this.socketService = SocketService.getInstance();
  }

  async execute(input: CampaignsModuleInput): Promise<ModuleResult> {
    try {
      this.socketService.emitProgress('wb-get-campaigns', 'Получение списка кампаний WB...');

      const campaigns = await this.wbService.getCampaigns({
        token: input.authToken,
        filters: input.filters
      });

      this.socketService.emitProgress('wb-get-campaigns', `Получено кампаний: ${campaigns.length}`);

      return {
        success: true,
        data: {
          campaigns,
          count: campaigns.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Unknown API error';

      this.socketService.emitError('wb-get-campaigns', errorMessage);

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
