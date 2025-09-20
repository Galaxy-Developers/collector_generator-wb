import { ModuleResult } from '../types/workflow';

export class DataAggregatorModule {
  async execute(input: any): Promise<ModuleResult> {
    try {
      const { campaigns = [], stats = [] } = input;

      const aggregatedData = campaigns.map((campaign: any) => {
        const campaignStats = stats.filter((s: any) => s.campaignId === campaign.id);

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          stats: campaignStats,
          totalViews: campaignStats.reduce((sum: number, s: any) => sum + (s.views || 0), 0),
          totalClicks: campaignStats.reduce((sum: number, s: any) => sum + (s.clicks || 0), 0),
        };
      });

      return {
        success: true,
        data: {
          aggregated: aggregatedData,
          count: aggregatedData.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error?.message || 'Data aggregation failed',
          code: 'AGGREGATION_ERROR',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
