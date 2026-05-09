// 주요 뉴스 Mock 데이터
// Data_Management_Skill.md [뉴스 데이터 정규화] 필드 기준
// 출처: Google Finance News 스크래핑 시뮬레이션

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;  // ISO 8601
  url: string;
  thumbnail: string | null;
  summary: string;
}

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Fed Holds Rates Steady as Inflation Data Shows Progress Toward 2% Target',
    source: 'Reuters',
    publishedAt: '2026-05-07T06:30:00Z',
    url: 'https://www.reuters.com',
    thumbnail: null,
    summary:
      'The Federal Reserve kept its benchmark interest rate unchanged at 4.25%–4.50%, signaling patience as April CPI data confirmed a gradual cooling in core inflation. Chair Powell emphasized data-dependency ahead of the June meeting.',
  },
  {
    id: 'news-2',
    title: 'NVIDIA Poised for Record Quarter as AI Infrastructure Demand Accelerates',
    source: 'Bloomberg',
    publishedAt: '2026-05-07T04:15:00Z',
    url: 'https://www.bloomberg.com',
    thumbnail: null,
    summary:
      "Wall Street analysts raised NVIDIA's Q1 revenue estimates above $38B ahead of the May 20 earnings release, citing surging Blackwell GPU orders from hyperscalers. Options market implies ±8% move on results day.",
  },
  {
    id: 'news-3',
    title: 'S&P 500 Extends Rally to 6-Week High on Strong Jobs Data and Tech Surge',
    source: 'The Wall Street Journal',
    publishedAt: '2026-05-07T02:00:00Z',
    url: 'https://www.wsj.com',
    thumbnail: null,
    summary:
      "The S&P 500 climbed 1.3% to close at 5,712, its highest since late March, driven by April's better-than-expected nonfarm payrolls of 182,000 and a broad-based rally in technology stocks. The VIX fell below 20 for the first time in six weeks.",
  },
  {
    id: 'news-4',
    title: '10-Year Treasury Yield Retreats to 4.38% as Safe-Haven Demand Returns',
    source: 'Financial Times',
    publishedAt: '2026-05-06T20:45:00Z',
    url: 'https://www.ft.com',
    thumbnail: null,
    summary:
      'U.S. 10-year Treasury yields pulled back sharply as investors rotated into fixed income following mixed global growth signals. The move reinforced expectations for one or two Fed rate cuts before year-end, with the December futures contract pricing 62 bps of easing.',
  },
  {
    id: 'news-5',
    title: 'Apple Expands Share Buyback to $110B, Boosts Quarterly Dividend by 4%',
    source: 'CNBC',
    publishedAt: '2026-05-06T18:00:00Z',
    url: 'https://www.cnbc.com',
    thumbnail: null,
    summary:
      "Apple announced its largest-ever share repurchase program alongside a 4% dividend increase, reinforcing confidence in its services-driven growth. The company also guided for Q3 revenue of $88–92B, above consensus estimates.",
  },
];

// 출처별 브랜드 색상 (썸네일 플레이스홀더용)
export const SOURCE_COLORS: Record<string, { bg: string; text: string; initial: string }> = {
  Reuters:                  { bg: '#FF6B35', text: '#FFFFFF', initial: 'R' },
  Bloomberg:                { bg: '#1E3A5F', text: '#FFFFFF', initial: 'B' },
  'The Wall Street Journal':{ bg: '#0080C6', text: '#FFFFFF', initial: 'W' },
  'Financial Times':        { bg: '#F15B2A', text: '#FFFFFF', initial: 'F' },
  CNBC:                     { bg: '#003087', text: '#FFFFFF', initial: 'C' },
};
