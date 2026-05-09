// 경제 이벤트 캘린더 정적 Mock 데이터
// Dashboard_Composition_Skills.md [경제 이벤트 캘린더]

export type EventImportance = 'high' | 'medium' | 'low';
export type EventType =
  | 'FOMC'
  | 'CPI'
  | 'PCE'
  | 'NFP'
  | 'GDP'
  | 'PMI'
  | 'RETAIL'
  | 'EARNINGS'
  | 'OTHER';

export interface EconomicEvent {
  id: string;
  eventDate: string;        // YYYY-MM-DD
  eventTime?: string;       // HH:MM (ET), 없으면 종일
  eventType: EventType;
  eventTitle: string;
  importance: EventImportance;
  relatedAsset: string;
  description: string;
}

export const ECONOMIC_EVENTS: EconomicEvent[] = [
  // ─── 2026년 4월 ────────────────────────────────────────────────
  {
    id: 'apr-jobs',
    eventDate: '2026-04-03',
    eventTime: '08:30',
    eventType: 'NFP',
    eventTitle: '3월 비농업 고용 지표',
    importance: 'high',
    relatedAsset: 'USD, S&P500',
    description: '미국 노동부 발표 3월 신규 일자리 수. 전월 대비 고용 변화 및 실업률이 동시 발표됨. 연준 통화정책 방향성에 핵심 영향.',
  },
  {
    id: 'apr-cpi',
    eventDate: '2026-04-10',
    eventTime: '08:30',
    eventType: 'CPI',
    eventTitle: '3월 소비자물가지수 (CPI)',
    importance: 'high',
    relatedAsset: 'USD, 국채, S&P500',
    description: '미국 노동통계국 발표 CPI. 헤드라인 및 근원 CPI(식품·에너지 제외)가 핵심. 연준 금리 결정에 직접적 영향.',
  },
  {
    id: 'apr-pce',
    eventDate: '2026-04-25',
    eventTime: '08:30',
    eventType: 'PCE',
    eventTitle: '3월 개인소비지출 물가 (PCE)',
    importance: 'high',
    relatedAsset: 'USD, 국채',
    description: '연준이 선호하는 물가 지표. 헤드라인 PCE 및 근원 PCE(식품·에너지 제외) 동시 발표. 인플레이션 목표(2%) 대비 평가.',
  },
  {
    id: 'apr-gdp',
    eventDate: '2026-04-29',
    eventTime: '08:30',
    eventType: 'GDP',
    eventTitle: 'Q1 2026 GDP 속보치',
    importance: 'high',
    relatedAsset: 'USD, S&P500',
    description: '미국 경제분석국(BEA) 발표 1분기 GDP 성장률(전기 대비 연율). 경기침체 우려가 있는 국면에서 방향성 가늠.',
  },
  // ─── 2026년 5월 ────────────────────────────────────────────────
  {
    id: 'may-jobs',
    eventDate: '2026-05-02',
    eventTime: '08:30',
    eventType: 'NFP',
    eventTitle: '4월 비농업 고용 지표',
    importance: 'high',
    relatedAsset: 'USD, S&P500',
    description: '미국 노동부 발표 4월 신규 일자리 수 및 실업률. 고용 시장 강도가 연준 금리 동결/인하 결정에 핵심 변수로 작용.',
  },
  {
    id: 'may-pmi',
    eventDate: '2026-05-05',
    eventTime: '09:45',
    eventType: 'PMI',
    eventTitle: '4월 서비스 PMI (최종치)',
    importance: 'medium',
    relatedAsset: 'USD, S&P500',
    description: 'S&P Global 발표 서비스업 PMI 최종치. 50 기준선 대비 경기 확장/수축 판단.',
  },
  {
    id: 'may-cpi',
    eventDate: '2026-05-13',
    eventTime: '08:30',
    eventType: 'CPI',
    eventTitle: '4월 소비자물가지수 (CPI)',
    importance: 'high',
    relatedAsset: 'USD, 국채, S&P500',
    description: '4월 CPI 발표. 연준 6월 FOMC 회의를 앞두고 물가 둔화 여부가 금리 인하 기대에 직접 영향.',
  },
  {
    id: 'may-retail',
    eventDate: '2026-05-15',
    eventTime: '08:30',
    eventType: 'RETAIL',
    eventTitle: '4월 소매판매',
    importance: 'medium',
    relatedAsset: 'USD, 소비재',
    description: '미국 인구조사국 발표 소매판매. 소비 지출 동향 파악. 소비자 신뢰 및 내수 경기 바로미터.',
  },
  {
    id: 'may-nvda-earnings',
    eventDate: '2026-05-20',
    eventTime: '16:30',
    eventType: 'EARNINGS',
    eventTitle: 'NVDA Q1 실적 발표',
    importance: 'high',
    relatedAsset: 'NVDA, 반도체 섹터',
    description: 'NVIDIA FY2027 Q1 실적 발표. AI 데이터센터 수요 및 Blackwell 아키텍처 매출이 핵심. 반도체·AI 섹터 전체 방향성에 영향.',
  },
  {
    id: 'may-pce',
    eventDate: '2026-05-22',
    eventTime: '08:30',
    eventType: 'PCE',
    eventTitle: '4월 개인소비지출 물가 (PCE)',
    importance: 'high',
    relatedAsset: 'USD, 국채',
    description: '연준 선호 물가 지표 4월치. 6월 FOMC 금리 결정의 마지막 주요 인플레이션 데이터 포인트.',
  },
  {
    id: 'may-gdp-revised',
    eventDate: '2026-05-29',
    eventTime: '08:30',
    eventType: 'GDP',
    eventTitle: 'Q1 2026 GDP 수정치',
    importance: 'medium',
    relatedAsset: 'USD, S&P500',
    description: '1분기 GDP 성장률 2차 추정치. 속보치 대비 개인소비·투자 항목 수정 내용 확인.',
  },
  // ─── 2026년 6월 ────────────────────────────────────────────────
  {
    id: 'jun-jobs',
    eventDate: '2026-06-05',
    eventTime: '08:30',
    eventType: 'NFP',
    eventTitle: '5월 비농업 고용 지표',
    importance: 'high',
    relatedAsset: 'USD, S&P500',
    description: '5월 신규 일자리 수 및 실업률. FOMC 회의 직전 마지막 주요 고용 지표.',
  },
  {
    id: 'jun-cpi',
    eventDate: '2026-06-10',
    eventTime: '08:30',
    eventType: 'CPI',
    eventTitle: '5월 소비자물가지수 (CPI)',
    importance: 'high',
    relatedAsset: 'USD, 국채, S&P500',
    description: '5월 CPI 발표. FOMC 회의 하루 전 발표되어 금리 결정에 즉각적 영향을 미치는 핵심 지표.',
  },
  {
    id: 'jun-fomc',
    eventDate: '2026-06-11',
    eventTime: '14:00',
    eventType: 'FOMC',
    eventTitle: 'FOMC 금리 결정 (6월)',
    importance: 'high',
    relatedAsset: 'USD, 국채, S&P500, 전 자산군',
    description: 'FOMC 기준금리 결정 발표 및 파월 의장 기자회견. 점도표(Dot Plot) 업데이트 포함. 연간 가장 중요한 통화정책 이벤트 중 하나.',
  },
  {
    id: 'jun-retail',
    eventDate: '2026-06-16',
    eventTime: '08:30',
    eventType: 'RETAIL',
    eventTitle: '5월 소매판매',
    importance: 'medium',
    relatedAsset: 'USD, 소비재',
    description: '5월 소매판매. 소비자 지출 동향 확인. 금리 인하 이후 소비 회복 여부 점검.',
  },
  {
    id: 'jun-pce',
    eventDate: '2026-06-26',
    eventTime: '08:30',
    eventType: 'PCE',
    eventTitle: '5월 개인소비지출 물가 (PCE)',
    importance: 'high',
    relatedAsset: 'USD, 국채',
    description: '5월 PCE 물가 지표. FOMC 금리 결정 이후 다음 회의를 위한 인플레이션 추세 확인.',
  },
  {
    id: 'jun-pmi',
    eventDate: '2026-06-23',
    eventTime: '09:45',
    eventType: 'PMI',
    eventTitle: '6월 제조업·서비스 PMI (플래시)',
    importance: 'medium',
    relatedAsset: 'USD, S&P500',
    description: 'S&P Global 6월 예비치(Flash) PMI. 경기 흐름 조기 진단 지표. 50 이상이면 확장.',
  },
  // ─── 2026년 7월 ────────────────────────────────────────────────
  {
    id: 'jul-jobs',
    eventDate: '2026-07-02',
    eventTime: '08:30',
    eventType: 'NFP',
    eventTitle: '6월 비농업 고용 지표',
    importance: 'high',
    relatedAsset: 'USD, S&P500',
    description: '6월 고용 지표. 독립기념일 연휴 직전 발표. 하반기 고용 트렌드 방향성 확인.',
  },
  {
    id: 'jul-cpi',
    eventDate: '2026-07-10',
    eventTime: '08:30',
    eventType: 'CPI',
    eventTitle: '6월 소비자물가지수 (CPI)',
    importance: 'high',
    relatedAsset: 'USD, 국채, S&P500',
    description: '6월 CPI. 연준 7월 FOMC 이전 마지막 물가 지표. 추가 금리 인하 가능성 판단에 결정적.',
  },
  {
    id: 'jul-aapl-earnings',
    eventDate: '2026-07-23',
    eventTime: '16:30',
    eventType: 'EARNINGS',
    eventTitle: 'AAPL Q3 실적 발표',
    importance: 'high',
    relatedAsset: 'AAPL, 나스닥',
    description: 'Apple FY2026 Q3 실적. iPhone 판매 및 서비스 매출 성장률이 핵심. 시가총액 1위 기업으로 나스닥 전체에 영향.',
  },
  {
    id: 'jul-fomc',
    eventDate: '2026-07-29',
    eventTime: '14:00',
    eventType: 'FOMC',
    eventTitle: 'FOMC 금리 결정 (7월)',
    importance: 'high',
    relatedAsset: 'USD, 국채, S&P500, 전 자산군',
    description: 'FOMC 기준금리 결정 발표. 파월 의장 기자회견. 연속 금리 인하 여부 및 하반기 통화정책 경로 가이던스 주목.',
  },
  {
    id: 'jul-pce',
    eventDate: '2026-07-31',
    eventTime: '08:30',
    eventType: 'PCE',
    eventTitle: '6월 개인소비지출 물가 (PCE)',
    importance: 'high',
    relatedAsset: 'USD, 국채',
    description: '6월 PCE 물가. FOMC 결정 당일 발표. 금리 결정 사후 검증 및 9월 회의 선행 지표.',
  },
];
