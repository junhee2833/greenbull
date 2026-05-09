import { create } from 'zustand';
import type { ServiceStatus, DashboardData, LiquidityRawInputs, SentimentRawInputs } from '@/src/types/market';
import {
  mockServiceStatus,
  mockDashboardData,
  mockLiquidityRawInputs,
  mockSentimentRawInputs,
} from '@/src/mocks/marketData';

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface MarketStore {
  // 서비스 상태
  serviceStatus: ServiceStatus;

  // 표시용 지표 데이터 (정규화된 형식)
  dashboardData: DashboardData;

  // 엔진 계산용 원시 입력값
  // - useLiquidityEngine / useSentimentEngine 훅이 여기서 읽어 계산
  liquidityRawInputs:  LiquidityRawInputs;
  sentimentRawInputs: SentimentRawInputs;

  // 로딩 / 에러
  isLoading: boolean;
  error: string | null;

  // Actions
  setServiceStatus:     (status: ServiceStatus)         => void;
  setDashboardData:     (data: DashboardData)           => void;
  setLiquidityRawInputs:(inputs: LiquidityRawInputs)   => void;
  setSentimentRawInputs:(inputs: SentimentRawInputs)   => void;
  setLoading:           (loading: boolean)              => void;
  setError:             (error: string | null)          => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMarketStore = create<MarketStore>((set) => ({
  serviceStatus:       mockServiceStatus,
  dashboardData:       mockDashboardData,
  liquidityRawInputs:  mockLiquidityRawInputs,
  sentimentRawInputs:  mockSentimentRawInputs,
  isLoading: false,
  error: null,

  setServiceStatus:     (status)  => set({ serviceStatus: status }),
  setDashboardData:     (data)    => set({ dashboardData: data }),
  setLiquidityRawInputs:(inputs)  => set({ liquidityRawInputs: inputs }),
  setSentimentRawInputs:(inputs)  => set({ sentimentRawInputs: inputs }),
  setLoading:           (loading) => set({ isLoading: loading }),
  setError:             (error)   => set({ error }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectServiceStatus     = (s: MarketStore) => s.serviceStatus;
export const selectMacroData         = (s: MarketStore) => s.dashboardData.macro;
export const selectLiquidityData     = (s: MarketStore) => s.dashboardData.liquidity;
export const selectSentimentData     = (s: MarketStore) => s.dashboardData.sentiment;
export const selectSectorData        = (s: MarketStore) => s.dashboardData.sectors;
export const selectLiquidityRawInputs= (s: MarketStore) => s.liquidityRawInputs;
export const selectSentimentRawInputs= (s: MarketStore) => s.sentimentRawInputs;
