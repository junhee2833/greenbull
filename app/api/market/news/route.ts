import { NextResponse } from 'next/server';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface NewsItem {
  id:          string;
  title:       string;
  summary:     string;
  source:      string;
  url:         string;
  publishedAt: string;
  thumbnail:   string | null;
}

export interface NewsApiResponse {
  items:     NewsItem[];
  updatedAt: string;
}

// ─── 고품질 금융 뉴스 데이터 ──────────────────────────────────────────────────

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const NEWS_DATA: NewsItem[] = [
  {
    id:          'news-1',
    title:       '미 연준(Fed), 인플레이션 둔화세 확인… 금리 인하 기대감 확산',
    summary:     '',
    source:      'Reuters',
    url:         'https://www.reuters.com/markets/us/fed-inflation',
    publishedAt: ago(1),
    thumbnail:   null,
  },
  {
    id:          'news-2',
    title:       '엔비디아 차세대 AI 칩 발표, 기술주 중심의 강력한 매수세 유입',
    summary:     '',
    source:      'Bloomberg',
    url:         'https://www.bloomberg.com/news/nvidia-ai-chip',
    publishedAt: ago(3),
    thumbnail:   null,
  },
  {
    id:          'news-3',
    title:       '글로벌 공급망 재편 속 한국 반도체 수출 역대 최고치 경신',
    summary:     '',
    source:      'CNBC',
    url:         'https://www.cnbc.com/korea-semiconductor-exports',
    publishedAt: ago(5),
    thumbnail:   null,
  },
  {
    id:          'news-4',
    title:       '달러 인덱스(DXY) 6개월 만에 최저… 신흥국 통화 강세 전환 신호',
    summary:     '',
    source:      'Financial Times',
    url:         'https://www.ft.com/content/dollar-index-low',
    publishedAt: ago(7),
    thumbnail:   null,
  },
  {
    id:          'news-5',
    title:       'S&P 500 사상 최고치 재경신… 실적 시즌 호조가 랠리 견인',
    summary:     '',
    source:      'AP News',
    url:         'https://apnews.com/article/sp500-record-high',
    publishedAt: ago(10),
    thumbnail:   null,
  },
];

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const response: NewsApiResponse = {
    items:     NEWS_DATA,
    updatedAt: new Date().toISOString(),
  };
  return NextResponse.json(response);
}
