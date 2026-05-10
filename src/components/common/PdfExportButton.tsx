'use client';

import { useState } from 'react';
import { Download, FileText, BarChart2, X, Loader2 } from 'lucide-react';
import { useMarketStore, selectServiceStatus, selectMacroData, selectLiquidityData, selectSentimentData } from '@/src/store/useMarketStore';
import { useLiquidityEngine } from '@/src/hooks/useLiquidityEngine';
import { useSentimentEngine } from '@/src/hooks/useSentimentEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'macro' | 'stock';
interface ChartImage { title: string; dataUrl: string; }

interface MacroPdfData {
  serviceStatus: { status: string; label: string; updatedAt: string };
  liquidity:     { state: string; totalScore: string; netLiquidityCurrent: string; netLiquidityMoM: string; liquidityFlowMoM: string };
  sentiment:     { state: string; totalScore: string; vix: string; fearGreed: string; rationalEmotional: string; highYieldSpread: string; killSwitch: string };
  macroIndicators: Array<{ name: string; currentValue: number | null; unit: string; changeRate: number | null }>;
  chartImages:   ChartImage[];
}

interface StockPdfData {
  symbol:      string;
  name:        string;
  sector:      string;
  currentPrice: number;
  changeRate:  number;
  week52High:  number;
  week52Low:   number;
  valuation:   { pe: number | null; forwardPe: number | null; pb: number | null; evEbitda: number | null; pegRatio: number | null; sectorPe: number | null; sectorPb: number | null; sectorEvEbitda: number | null };
  financials:  { marketCap: number | null; eps: number | null; roe: number | null; debtRatio: number | null; dividendYield: number | null };
  marketContext: { liquidityState: string; sentimentState: string; killSwitch: string };
  chartImages: ChartImage[];
}

// ─── Layout & brand constants ─────────────────────────────────────────────────

const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN    = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;       // 182
const COL_W     = (CONTENT_W - 4) / 2;       // ~89
const IMG_H     = Math.round(COL_W * 0.58);  // ~52

// RGB tuples
const DG  = [0,   77,  64 ] as [number,number,number];  // #004d40 deep green
const LG  = [241, 248, 245] as [number,number,number];  // #f1f8f5 light green
const FG  = [25,  31,  40 ] as [number,number,number];  // foreground
const NT  = [78,  89,  104] as [number,number,number];  // neutral
const BD  = [229, 232, 235] as [number,number,number];  // border
const BU  = [22,  199, 132] as [number,number,number];  // bull
const BE  = [240, 68,  82 ] as [number,number,number];  // bear
const WHT = [255, 255, 255] as [number,number,number];

// ─── Mock Korean market data ──────────────────────────────────────────────────

const MOCK_INDICES = [
  { name: '코스피',     value: '2,531.22',  change: '+12.34',  pct: '+0.49%', up: true  },
  { name: '코스닥',     value: '721.84',    change: '+3.21',   pct: '+0.45%', up: true  },
  { name: 'S&P 500',   value: '5,248.33',  change: '-18.22',  pct: '-0.35%', up: false },
  { name: 'NASDAQ',    value: '16,312.44', change: '-41.13',  pct: '-0.25%', up: false },
  { name: 'NIKKEI 225',value: '38,472.11', change: '+243.52', pct: '+0.64%', up: true  },
];

const MOCK_INVESTOR_FLOWS = [
  { type: '개인',   kospi: '+2,341억', kosdaq: '+412억',   net: '+1,123억', up: true  },
  { type: '외국인', kospi: '+8,921억', kosdaq: '+1,234억', net: '+3,421억', up: true  },
  { type: '기관',   kospi: '-3,451억', kosdaq: '-891억',   net: '-2,301억', up: false },
];

const MOCK_FEATURED_STOCKS = [
  { name: '삼성전자',      code: '005930', price: '74,500',  change: '+1.5%', up: true,  reason: '외국인 순매수 4일 연속'   },
  { name: 'SK하이닉스',    code: '000660', price: '182,000', change: '+2.8%', up: true,  reason: 'HBM 공급 계약 체결 기대' },
  { name: '카카오',        code: '035720', price: '42,150',  change: '-1.2%', up: false, reason: '플랫폼 규제 리스크 부각' },
  { name: 'LG에너지솔루션', code: '373220', price: '352,000', change: '+0.8%', up: true,  reason: '미국 IRA 세액공제 수혜'  },
  { name: 'POSCO홀딩스',   code: '005490', price: '318,000', change: '-0.4%', up: false, reason: '철강 가격 하락 우려'     },
  { name: '현대차',        code: '005380', price: '231,000', change: '+1.1%', up: true,  reason: '미국 전기차 판매 호조'   },
  { name: '셀트리온',      code: '068270', price: '198,500', change: '+3.2%', up: true,  reason: '바이오시밀러 FDA 승인'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function captureElement(el: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF', logging: false });
  return canvas.toDataURL('image/png');
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    str += String.fromCharCode(...(bytes.subarray(i, i + chunk) as unknown as number[]));
  }
  return btoa(str);
}

async function embedKoreanFont(doc: any): Promise<void> {
  const res = await fetch('/fonts/NotoSansKR.ttf');
  const buf = await res.arrayBuffer();
  const b64 = arrayBufferToBase64(buf);
  doc.addFileToVFS('NotoSansKR.ttf', b64);
  doc.addFont('NotoSansKR.ttf', 'NotoSansKR', 'normal');
  doc.setFont('NotoSansKR', 'normal');
}

// Draws the branded header bar on the current page. Returns y position to start content.
function drawHeader(doc: any, title: string, subtitle: string, dateStr: string): number {
  const H = 16;
  doc.setFillColor(...DG);
  doc.rect(0, 0, PAGE_W, H, 'F');
  doc.setFillColor(...BU);
  doc.rect(0, 0, 3, H, 'F');

  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(...WHT);
  doc.text(title, MARGIN + 2, 10.5);

  doc.setFontSize(8.5);
  doc.text(subtitle, MARGIN + 2, 14.5);

  doc.setFontSize(7);
  doc.setTextColor(200, 230, 225);
  doc.text(dateStr, PAGE_W - MARGIN, 14.5, { align: 'right' });

  return H + 6;
}

// Adds footer (separator line + disclaimer + page number) to every page.
function addSectionFooters(doc: any, pageCount: number): void {
  const DISCLAIMER = 'GreenBull Research · 본 자료는 투자 참고용이며, 투자 판단의 책임은 투자자 본인에게 있습니다. 데이터는 Mock 시뮬레이션 기반입니다.';
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BD);
    doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    doc.setFont('NotoSansKR', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...NT);
    const lines = doc.splitTextToSize(DISCLAIMER, CONTENT_W - 20);
    doc.text(lines, MARGIN, PAGE_H - 9.5);
    doc.text(`${p} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 9.5, { align: 'right' });
  }
}

// ─── Macro PDF ────────────────────────────────────────────────────────────────

async function generateMacroPdf(data: MacroPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await embedKoreanFont(doc);

  const issueDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  const issueTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  let y = drawHeader(doc, 'GreenBull Morning Brief', `리서치팀 · 전체 매크로 분석 · ${issueDate}`, issueTime);

  // ── Summary box ────────────────────────────────────────────────────────────
  const boxH = 27;
  doc.setFillColor(...LG);
  doc.rect(MARGIN, y, CONTENT_W, boxH, 'F');
  doc.setFillColor(...DG);
  doc.rect(MARGIN, y, 2.5, boxH, 'F');

  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DG);
  doc.text('금일 핵심 요약', MARGIN + 5, y + 5.5);

  const bullets = [
    `유동성: ${data.liquidity.state}  (종합점수 ${data.liquidity.totalScore})`,
    `센티멘트: ${data.sentiment.state}  (점수 ${data.sentiment.totalScore})`,
    `VIX ${data.sentiment.vix}  |  공포/탐욕 ${data.sentiment.fearGreed}  |  하이일드 스프레드 ${data.sentiment.highYieldSpread}`,
    `이성/감성 지수: ${data.sentiment.rationalEmotional}`,
    data.sentiment.killSwitch !== '비활성'
      ? `⚠ Kill Switch ${data.sentiment.killSwitch}`
      : '포트폴리오 리스크 필터: 정상',
  ];
  doc.setFontSize(7.5);
  doc.setTextColor(...FG);
  bullets.forEach((b, i) => {
    doc.text(`• ${b}`, MARGIN + 5, y + 11 + i * 3.3);
  });
  y += boxH + 6;

  // Shared autoTable defaults
  const tblDefaults = {
    styles:           { font: 'NotoSansKR', fontStyle: 'normal', fontSize: 8, cellPadding: 2 },
    headStyles:       { fillColor: DG, textColor: WHT, fontStyle: 'normal' },
    alternateRowStyles: { fillColor: LG },
    margin:           { left: MARGIN, right: MARGIN },
  } as const;

  // ── Table 1: 국내외 시장 지수 ──────────────────────────────────────────────
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('국내외 시장 지수', MARGIN, y);
  y += 4;

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    head: [['지수', '현재', '등락', '등락률']],
    body: MOCK_INDICES.map(r => [r.name, r.value, r.change, r.pct]),
    columnStyles: { 0: { cellWidth: 36 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 } },
    didParseCell: (d: any) => {
      if (d.section === 'body' && d.column.index >= 2) {
        d.cell.styles.textColor = MOCK_INDICES[d.row.index]?.up ? BU : BE;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Table 2: 투자자별 매매동향 ────────────────────────────────────────────
  if (y > PAGE_H - 60) { doc.addPage(); y = drawHeader(doc, 'GreenBull Morning Brief', '리서치팀 · 전체 매크로 분석', issueDate); }
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('투자자별 매매동향 (코스피 / 코스닥)', MARGIN, y);
  y += 4;

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    head: [['구분', '코스피 순매수', '코스닥 순매수', '합산 순매수']],
    body: MOCK_INVESTOR_FLOWS.map(r => [r.type, r.kospi, r.kosdaq, r.net]),
    didParseCell: (d: any) => {
      if (d.section === 'body' && d.column.index >= 1) {
        d.cell.styles.textColor = MOCK_INVESTOR_FLOWS[d.row.index]?.up ? BU : BE;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Table 3: 일일 특징주 ──────────────────────────────────────────────────
  if (y > PAGE_H - 72) { doc.addPage(); y = drawHeader(doc, 'GreenBull Morning Brief', '리서치팀 · 전체 매크로 분석', issueDate); }
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('일일 특징주', MARGIN, y);
  y += 4;

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    styles: { ...tblDefaults.styles, fontSize: 7.5 },
    head: [['종목명', '코드', '현재가', '등락률', '특징 사유']],
    body: MOCK_FEATURED_STOCKS.map(r => [r.name, r.code, r.price, r.change, r.reason]),
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 18 }, 2: { cellWidth: 22 }, 3: { cellWidth: 18 } },
    didParseCell: (d: any) => {
      if (d.section === 'body' && d.column.index === 3) {
        d.cell.styles.textColor = MOCK_FEATURED_STOCKS[d.row.index]?.up ? BU : BE;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Table 4: 주요 거시경제 지표 ───────────────────────────────────────────
  if (y > PAGE_H - 60) { doc.addPage(); y = drawHeader(doc, 'GreenBull Morning Brief', '리서치팀 · 전체 매크로 분석', issueDate); }
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('주요 거시경제 지표', MARGIN, y);
  y += 4;

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    head: [['지표명', '현재값', '등락률']],
    body: data.macroIndicators.map(ind => {
      const val = ind.currentValue === null ? 'N/A'
        : ind.unit === '%'           ? `${ind.currentValue.toFixed(2)}%`
        : ind.currentValue >= 1000   ? ind.currentValue.toLocaleString('en-US', { maximumFractionDigits: 1 })
        : ind.currentValue.toFixed(2);
      const rate = ind.changeRate === null ? 'N/A'
        : `${ind.changeRate >= 0 ? '+' : ''}${ind.changeRate.toFixed(2)}%`;
      return [ind.name, val, rate];
    }),
    columnStyles: { 2: { cellWidth: 28 } },
    didParseCell: (d: any) => {
      if (d.section === 'body' && d.column.index === 2) {
        const ind = data.macroIndicators[d.row.index];
        if (ind?.changeRate !== null && ind?.changeRate !== undefined) {
          d.cell.styles.textColor = ind.changeRate >= 0 ? BU : BE;
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Table 5: 시장 종합 지표 ───────────────────────────────────────────────
  if (y > PAGE_H - 50) { doc.addPage(); y = drawHeader(doc, 'GreenBull Morning Brief', '리서치팀 · 전체 매크로 분석', issueDate); }
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('시장 종합 지표 (GreenBull 독자)', MARGIN, y);
  y += 4;

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    head: [['구분', '상태', '점수']],
    body: [
      ['유동성 통합',    data.liquidity.state,          data.liquidity.totalScore],
      ['센티멘트 통합',  data.sentiment.state,          data.sentiment.totalScore],
      ['이성/감성 지수', data.sentiment.rationalEmotional, '-'],
      ['포트폴리오 필터', data.sentiment.killSwitch !== '비활성'
        ? `⚠ ${data.sentiment.killSwitch}` : '정상', '-'],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Chart images (2-column grid) ──────────────────────────────────────────
  if (data.chartImages.length > 0) {
    if (y > PAGE_H - IMG_H - 20) { doc.addPage(); y = drawHeader(doc, 'GreenBull Morning Brief', '리서치팀 · 차트 시각화', issueDate); }
    doc.setFont('NotoSansKR', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DG);
    doc.text('차트 시각화', MARGIN, y);
    y += 5;

    for (let i = 0; i < data.chartImages.length; i += 2) {
      if (y + IMG_H > PAGE_H - 14) { doc.addPage(); y = drawHeader(doc, 'GreenBull Morning Brief', '리서치팀 · 차트 시각화', issueDate); }
      const left  = data.chartImages[i];
      const right = data.chartImages[i + 1];
      doc.setFontSize(7);
      doc.setTextColor(...NT);
      doc.text(left.title, MARGIN, y);
      if (right) doc.text(right.title, MARGIN + COL_W + 4, y);
      y += 3;
      doc.addImage(left.dataUrl,  'PNG', MARGIN,              y, COL_W, IMG_H);
      if (right) doc.addImage(right.dataUrl, 'PNG', MARGIN + COL_W + 4, y, COL_W, IMG_H);
      y += IMG_H + 6;
    }
  }

  addSectionFooters(doc, doc.getNumberOfPages());
  doc.save(`GreenBull_MorningBrief_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Stock PDF ────────────────────────────────────────────────────────────────

async function generateStockPdf(data: StockPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await embedKoreanFont(doc);

  const issueDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  let y = drawHeader(doc, 'GreenBull Research Report', `리서치팀 · 종목 분석 · ${data.symbol} (${data.name})`, issueDate);

  // ── Price highlight box ────────────────────────────────────────────────────
  const priceColor = data.changeRate >= 0 ? BU : BE;
  const boxH = 15;
  doc.setFillColor(...LG);
  doc.rect(MARGIN, y, CONTENT_W, boxH, 'F');
  doc.setFillColor(...priceColor);
  doc.rect(MARGIN, y, 2.5, boxH, 'F');

  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(...priceColor);
  doc.text(`$${data.currentPrice.toFixed(2)}`, MARGIN + 6, y + 8.5);

  doc.setFontSize(10);
  doc.text(`${data.changeRate >= 0 ? '+' : ''}${data.changeRate.toFixed(2)}%`, MARGIN + 44, y + 8.5);

  doc.setFontSize(7.5);
  doc.setTextColor(...NT);
  doc.text(
    `섹터: ${data.sector}  |  52주 최고: $${data.week52High.toFixed(2)}  |  52주 최저: $${data.week52Low.toFixed(2)}`,
    MARGIN + 6, y + 13,
  );
  y += boxH + 6;

  const tblDefaults = {
    styles:             { font: 'NotoSansKR', fontStyle: 'normal', fontSize: 8, cellPadding: 2 },
    headStyles:         { fillColor: DG, textColor: WHT, fontStyle: 'normal' },
    alternateRowStyles: { fillColor: LG },
    margin:             { left: MARGIN, right: MARGIN },
  } as const;

  // ── Table 1: 밸류에이션 비교 ──────────────────────────────────────────────
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('밸류에이션 비교 (vs 섹터 평균)', MARGIN, y);
  y += 4;

  const valRows: [string, number | null, number | null][] = [
    ['P/E (TTM)',   data.valuation.pe,        data.valuation.sectorPe],
    ['Forward P/E', data.valuation.forwardPe, data.valuation.sectorPe],
    ['P/B',         data.valuation.pb,        data.valuation.sectorPb],
    ['EV/EBITDA',   data.valuation.evEbitda,  data.valuation.sectorEvEbitda],
    ['PEG Ratio',   data.valuation.pegRatio,  null],
  ];

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    head: [['지표', '종목', '섹터 평균', '평가']],
    body: valRows.map(([label, company, sector]) => [
      label,
      company !== null ? company.toFixed(1) : 'N/A',
      sector  !== null ? sector.toFixed(1)  : '-',
      company !== null && sector !== null ? (company < sector ? '저평가' : '고평가') : '-',
    ]),
    didParseCell: (d: any) => {
      if (d.section === 'body') {
        const [, company, sector] = valRows[d.row.index];
        if (company !== null && sector !== null) {
          const color = company < sector ? BU : BE;
          if (d.column.index === 1 || d.column.index === 3) d.cell.styles.textColor = color;
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Table 2: 주요 재무 지표 ───────────────────────────────────────────────
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('주요 재무 지표', MARGIN, y);
  y += 4;

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    head: [['지표', '값']],
    body: [
      ['시가총액',    data.financials.marketCap     !== null ? `$${(data.financials.marketCap / 1e12).toFixed(2)}T` : 'N/A'],
      ['EPS (TTM)',  data.financials.eps            !== null ? `$${data.financials.eps.toFixed(2)}`                 : 'N/A'],
      ['ROE',        data.financials.roe            !== null ? `${data.financials.roe.toFixed(1)}%`                 : 'N/A'],
      ['부채 비율',  data.financials.debtRatio      !== null ? `${data.financials.debtRatio.toFixed(1)}%`           : 'N/A'],
      ['배당 수익률', data.financials.dividendYield !== null ? `${data.financials.dividendYield.toFixed(2)}%`       : 'N/A'],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Table 3: 시장 환경 요약 ───────────────────────────────────────────────
  doc.setFont('NotoSansKR', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DG);
  doc.text('현재 시장 환경 (GreenBull 분석)', MARGIN, y);
  y += 4;

  autoTable(doc, {
    ...tblDefaults,
    startY: y,
    head: [['항목', '상태']],
    body: [
      ['유동성 국면',            data.marketContext.liquidityState],
      ['센티멘트 국면',          data.marketContext.sentimentState],
      ['포트폴리오 리스크 필터', data.marketContext.killSwitch !== '비활성'
        ? `⚠ ${data.marketContext.killSwitch}` : '정상 (필터 미활성)'],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Chart images ──────────────────────────────────────────────────────────
  if (data.chartImages.length > 0) {
    if (y > PAGE_H - IMG_H - 20) { doc.addPage(); y = drawHeader(doc, 'GreenBull Research Report', `리서치팀 · 종목 분석 · ${data.symbol}`, issueDate); }
    doc.setFont('NotoSansKR', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DG);
    doc.text('가격 차트', MARGIN, y);
    y += 5;

    for (let i = 0; i < data.chartImages.length; i += 2) {
      if (y + IMG_H > PAGE_H - 14) { doc.addPage(); y = drawHeader(doc, 'GreenBull Research Report', `리서치팀 · 종목 분석 · ${data.symbol}`, issueDate); }
      const left  = data.chartImages[i];
      const right = data.chartImages[i + 1];
      doc.setFontSize(7);
      doc.setTextColor(...NT);
      doc.text(left.title, MARGIN, y);
      if (right) doc.text(right.title, MARGIN + COL_W + 4, y);
      y += 3;
      doc.addImage(left.dataUrl,  'PNG', MARGIN,              y, COL_W, IMG_H);
      if (right) doc.addImage(right.dataUrl, 'PNG', MARGIN + COL_W + 4, y, COL_W, IMG_H);
      y += IMG_H + 6;
    }
  }

  addSectionFooters(doc, doc.getNumberOfPages());
  doc.save(`GreenBull_${data.symbol}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Report select modal ──────────────────────────────────────────────────────

interface ReportOption {
  type:  ReportType;
  icon:  React.ReactNode;
  title: string;
  desc:  string;
  items: string[];
}

function ReportSelectModal({ onSelect, onClose }: { onSelect: (type: ReportType) => void; onClose: () => void }) {
  const options: ReportOption[] = [
    {
      type:  'macro',
      icon:  <BarChart2 size={18} className="text-bull" />,
      title: '전체 매크로 리포트',
      desc:  '국내외 시장 지수·투자자 동향·특징주·거시 지표를 포함한 Morning Brief',
      items: ['국내외 시장 지수 (5개)', '투자자별 매매동향', '일일 특징주 (7종목)', '유동성·센티멘트 종합 지표'],
    },
    {
      type:  'stock',
      icon:  <FileText size={18} className="text-risk" />,
      title: '개별 종목 리포트',
      desc:  '종목 상세 분석 섹션의 현재 데이터',
      items: ['가격 정보 & 52주 범위', '밸류에이션 비교 (vs 섹터)', '주요 재무 지표', '시장 환경 요약'],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">PDF 리포트 내보내기</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-market-neutral hover:bg-surface hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className="w-full rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-card-hover hover:border-bull/30"
            >
              <div className="mb-1 flex items-center gap-2">
                {opt.icon}
                <span className="text-sm font-semibold text-foreground">{opt.title}</span>
              </div>
              <p className="mb-2 text-xs text-market-neutral">{opt.desc}</p>
              <ul className="space-y-0.5">
                {opt.items.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-[10px] text-market-neutral/70">
                    <span className="size-1 flex-none rounded-full bg-market-neutral/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PdfExportButton ──────────────────────────────────────────────────────────

export default function PdfExportButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]   = useState(false);

  const serviceStatus    = useMarketStore(selectServiceStatus);
  const macroIndicators  = useMarketStore(selectMacroData);
  const liquidityData    = useMarketStore(selectLiquidityData);
  const sentimentData    = useMarketStore(selectSentimentData);
  const liq  = useLiquidityEngine();
  const sent = useSentimentEngine();

  async function handleSelect(type: ReportType) {
    setShowModal(false);
    setLoading(true);
    try {
      if (type === 'macro') {
        const chartImages: ChartImage[] = [];
        for (const id of ['liquidity', 'sentiment']) {
          const el = document.getElementById(id);
          if (el) {
            try { chartImages.push({ title: id === 'liquidity' ? '유동성 지표 패널' : '시장 센티멘트 패널', dataUrl: await captureElement(el) }); } catch {}
          }
        }

        await generateMacroPdf({
          serviceStatus: { status: serviceStatus.status, label: serviceStatus.label, updatedAt: serviceStatus.updatedAt },
          liquidity: {
            state:                liq.state,
            totalScore:           liq.formatted.totalScore,
            netLiquidityCurrent:  liq.formatted.netLiquidityCurrent,
            netLiquidityMoM:      liq.formatted.netLiquidityMoM,
            liquidityFlowMoM:     liq.formatted.liquidityFlowMoM,
          },
          sentiment: {
            state:              sent.state,
            totalScore:         sent.formatted.totalScore,
            vix:                sent.formatted.vix,
            fearGreed:          sent.formatted.fearGreed,
            rationalEmotional:  sent.formatted.rationalEmotional,
            highYieldSpread:    sent.formatted.highYieldSpread,
            killSwitch:         sent.killSwitchActive ? `활성 (${sent.killSwitchReason ?? ''})` : '비활성',
          },
          macroIndicators: macroIndicators.map(ind => ({
            name: ind.name, currentValue: ind.currentValue, unit: ind.unit, changeRate: ind.changeRate,
          })),
          chartImages,
        });
      } else {
        const chartImages: ChartImage[] = [];
        const stockEl = document.getElementById('stock');
        if (stockEl) {
          try { chartImages.push({ title: '종목 상세 분석', dataUrl: await captureElement(stockEl) }); } catch {}
        }

        await generateStockPdf({
          symbol:       'AAPL',
          name:         'Apple Inc.',
          sector:       'Technology',
          currentPrice: 213.49,
          changeRate:   0.84,
          week52High:   237.23,
          week52Low:    164.08,
          valuation:    { pe: 32.1, forwardPe: 28.4, pb: 48.2, evEbitda: 24.6, pegRatio: 2.1, sectorPe: 34.2, sectorPb: 12.8, sectorEvEbitda: 22.1 },
          financials:   { marketCap: 3.2e12, eps: 6.65, roe: 147.3, debtRatio: 31.2, dividendYield: 0.44 },
          marketContext: {
            liquidityState:  liq.state,
            sentimentState:  sent.state,
            killSwitch:      sent.killSwitchActive ? '활성' : '비활성',
          },
          chartImages,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-market-neutral transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
        title="PDF 리포트 내보내기"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        <span className="hidden sm:inline">{loading ? 'PDF 생성 중...' : 'PDF'}</span>
      </button>

      {showModal && (
        <ReportSelectModal onSelect={handleSelect} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
