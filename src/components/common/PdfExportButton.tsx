'use client';

import { useState } from 'react';
import { Download, FileText, BarChart2, X, Loader2 } from 'lucide-react';
import { useMarketStore, selectServiceStatus, selectMacroData, selectLiquidityData, selectSentimentData } from '@/src/store/useMarketStore';
import { useLiquidityEngine } from '@/src/hooks/useLiquidityEngine';
import { useSentimentEngine } from '@/src/hooks/useSentimentEngine';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type ReportType = 'macro' | 'stock';

// ─── PDF 생성 헬퍼 ────────────────────────────────────────────────────────────

async function captureElement(el: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#FFFFFF',
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

// A4 portrait: 210 × 297 mm — jsPDF 기본 단위 mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

async function generateMacroPdf(data: MacroPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = MARGIN;

  // ── 타이틀 ────────────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setTextColor(14, 213, 143); // bull #0ED58F
  doc.text('GreenBull Dashboard', MARGIN, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(78, 89, 104); // market-neutral #4E5968
  doc.text('전체 매크로 분석 리포트', MARGIN, y);
  y += 5;

  doc.setFontSize(8);
  doc.text(`생성일시: ${new Date().toLocaleString('ko-KR')} · 데이터: Mock 시뮬레이션`, MARGIN, y);
  y += 2;

  // 구분선
  doc.setDrawColor(229, 232, 235); // border #E5E8EB
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ── 서비스 상태 ───────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40); // foreground #191F28
  doc.text('서비스 상태', MARGIN, y);
  y += 5;

  const statusColor: Record<string, [number, number, number]> = {
    normal:  [14, 213, 143],  // #0ED58F
    delayed: [245, 158, 11],  // #F59E0B
    error:   [240, 68, 82],   // #F04452
  };
  const [sr, sg, sb] = statusColor[data.serviceStatus.status];
  doc.setFontSize(9);
  doc.setTextColor(sr, sg, sb);
  doc.text(`● ${data.serviceStatus.label} · 업데이트 ${new Date(data.serviceStatus.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`, MARGIN + 2, y);
  y += 7;

  // ── 유동성 지표 ───────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40);
  doc.text('유동성 통합 지표', MARGIN, y);
  y += 5;

  const liqRows = [
    ['상태', data.liquidity.state],
    ['TotalScore', data.liquidity.totalScore],
    ['순유동성 현재', data.liquidity.netLiquidityCurrent],
    ['순유동성 MoM', data.liquidity.netLiquidityMoM],
    ['TGA+RRP 변화', data.liquidity.liquidityFlowMoM],
  ];
  doc.setFontSize(8);
  for (const [label, value] of liqRows) {
    doc.setTextColor(78, 89, 104);
    doc.text(label, MARGIN + 2, y);
    doc.setTextColor(25, 31, 40);
    doc.text(String(value), MARGIN + 50, y);
    y += 4.5;
  }
  y += 3;

  // ── 시장 센티멘트 ─────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40);
  doc.text('종합 시장 센티멘트', MARGIN, y);
  y += 5;

  const sentRows = [
    ['상태', data.sentiment.state],
    ['TotalScore', data.sentiment.totalScore],
    ['VIX', data.sentiment.vix],
    ['공포/탐욕 지수', data.sentiment.fearGreed],
    ['이성/감성 지수', data.sentiment.rationalEmotional],
    ['하이일드 스프레드', data.sentiment.highYieldSpread],
    ['Kill Switch', data.sentiment.killSwitch],
  ];
  doc.setFontSize(8);
  for (const [label, value] of sentRows) {
    doc.setTextColor(78, 89, 104);
    doc.text(label, MARGIN + 2, y);
    doc.setTextColor(25, 31, 40);
    doc.text(String(value), MARGIN + 50, y);
    y += 4.5;
  }
  y += 3;

  // ── 매크로 지표 ───────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40);
  doc.text('주요 거시경제 지표', MARGIN, y);
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(78, 89, 104);
  doc.text('지표명', MARGIN + 2, y);
  doc.text('현재값', MARGIN + 60, y);
  doc.text('변화율', MARGIN + 90, y);
  y += 1;
  doc.setDrawColor(229, 232, 235);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

  for (const ind of data.macroIndicators) {
    if (y > PAGE_H - MARGIN - 10) {
      doc.addPage();
      y = MARGIN;
    }
    const val =
      ind.currentValue === null
        ? 'N/A'
        : ind.unit === '%'
        ? `${ind.currentValue.toFixed(2)}%`
        : ind.currentValue >= 1000
        ? ind.currentValue.toLocaleString('en-US', { maximumFractionDigits: 1 })
        : ind.currentValue.toFixed(2);

    const rate =
      ind.changeRate === null
        ? 'N/A'
        : `${ind.changeRate >= 0 ? '+' : ''}${ind.changeRate.toFixed(2)}%`;

    doc.setTextColor(25, 31, 40);
    doc.text(ind.name, MARGIN + 2, y);
    doc.text(val, MARGIN + 60, y);

    if (ind.changeRate !== null) {
      const [cr, cg, cb] = ind.changeRate >= 0 ? [14, 213, 143] : [240, 68, 82];
      doc.setTextColor(cr, cg, cb);
    } else {
      doc.setTextColor(78, 89, 104);
    }
    doc.text(rate, MARGIN + 90, y);
    y += 4.5;
  }

  // ── 차트 이미지 삽입 ──────────────────────────────────────────────────────
  if (data.chartImages.length > 0) {
    doc.addPage();
    y = MARGIN;
    doc.setFontSize(10);
    doc.setTextColor(25, 31, 40);
    doc.text('차트 시각화', MARGIN, y);
    y += 6;

    for (const { title, dataUrl } of data.chartImages) {
      if (y > PAGE_H - MARGIN - 60) {
        doc.addPage();
        y = MARGIN;
      }
      doc.setFontSize(8);
      doc.setTextColor(78, 89, 104);
      doc.text(title, MARGIN, y);
      y += 3;
      const imgH = 60;
      doc.addImage(dataUrl, 'PNG', MARGIN, y, CONTENT_W, imgH);
      y += imgH + 6;
    }
  }

  // ── 푸터 ─────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(78, 89, 104);
    doc.text(`GreenBull Dashboard · Mock 데이터 기반 시뮬레이션 · ${p} / ${pageCount}`, MARGIN, PAGE_H - 6);
  }

  doc.save(`GreenBull_Macro_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function generateStockPdf(data: StockPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = MARGIN;

  // ── 타이틀 ────────────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setTextColor(14, 213, 143);
  doc.text('GreenBull Dashboard', MARGIN, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(78, 89, 104);
  doc.text(`종목 분석 리포트 · ${data.symbol} (${data.name})`, MARGIN, y);
  y += 5;

  doc.setFontSize(8);
  doc.text(`생성일시: ${new Date().toLocaleString('ko-KR')} · 데이터: Mock 시뮬레이션`, MARGIN, y);
  y += 2;

  doc.setDrawColor(229, 232, 235);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ── 가격 정보 ─────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40);
  doc.text('가격 정보', MARGIN, y);
  y += 5;

  const [pr, pg, pb] = data.changeRate >= 0 ? [14, 213, 143] : [240, 68, 82];
  doc.setFontSize(14);
  doc.setTextColor(pr, pg, pb);
  doc.text(`$${data.currentPrice.toFixed(2)}`, MARGIN + 2, y);
  doc.setFontSize(9);
  doc.text(`  ${data.changeRate >= 0 ? '+' : ''}${data.changeRate.toFixed(2)}%`, MARGIN + 30, y);
  y += 6;

  const priceRows = [
    ['52주 최고가', `$${data.week52High.toFixed(2)}`],
    ['52주 최저가', `$${data.week52Low.toFixed(2)}`],
    ['섹터', data.sector],
  ];
  doc.setFontSize(8);
  for (const [label, value] of priceRows) {
    doc.setTextColor(78, 89, 104);
    doc.text(label, MARGIN + 2, y);
    doc.setTextColor(25, 31, 40);
    doc.text(value, MARGIN + 40, y);
    y += 4.5;
  }
  y += 3;

  // ── 밸류에이션 ────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40);
  doc.text('밸류에이션 비교', MARGIN, y);
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(78, 89, 104);
  const colX = [MARGIN + 2, MARGIN + 60, MARGIN + 95];
  doc.text('지표', colX[0], y);
  doc.text('종목', colX[1], y);
  doc.text('섹터 평균', colX[2], y);
  y += 1;
  doc.setDrawColor(229, 232, 235);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

  const valRows: [string, number | null, number | null][] = [
    ['P/E (TTM)', data.valuation.pe, data.valuation.sectorPe],
    ['Forward P/E', data.valuation.forwardPe, data.valuation.sectorPe],
    ['P/B', data.valuation.pb, data.valuation.sectorPb],
    ['EV/EBITDA', data.valuation.evEbitda, data.valuation.sectorEvEbitda],
    ['PEG Ratio', data.valuation.pegRatio, null],
  ];

  for (const [label, company, sector] of valRows) {
    doc.setTextColor(25, 31, 40);
    doc.text(label, colX[0], y);

    const cStr = company !== null ? company.toFixed(1) : 'N/A';
    if (company !== null && sector !== null) {
      const [r2, g2, b2] = company < sector ? [14, 213, 143] : [240, 68, 82];
      doc.setTextColor(r2, g2, b2);
    } else {
      doc.setTextColor(25, 31, 40);
    }
    doc.text(cStr, colX[1], y);

    doc.setTextColor(78, 89, 104);
    doc.text(sector !== null ? sector.toFixed(1) : '-', colX[2], y);
    y += 4.5;
  }
  y += 3;

  // ── 재무 지표 ─────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40);
  doc.text('주요 재무 지표', MARGIN, y);
  y += 5;

  const finRows = [
    ['시가총액', data.financials.marketCap !== null ? `$${(data.financials.marketCap / 1e12).toFixed(2)}T` : 'N/A'],
    ['EPS (TTM)', data.financials.eps !== null ? `$${data.financials.eps.toFixed(2)}` : 'N/A'],
    ['ROE', data.financials.roe !== null ? `${data.financials.roe.toFixed(1)}%` : 'N/A'],
    ['부채 비율', data.financials.debtRatio !== null ? `${data.financials.debtRatio.toFixed(1)}%` : 'N/A'],
    ['배당 수익률', data.financials.dividendYield !== null ? `${data.financials.dividendYield.toFixed(2)}%` : 'N/A'],
  ];
  doc.setFontSize(8);
  for (const [label, value] of finRows) {
    doc.setTextColor(78, 89, 104);
    doc.text(label, MARGIN + 2, y);
    doc.setTextColor(25, 31, 40);
    doc.text(value, MARGIN + 50, y);
    y += 4.5;
  }
  y += 3;

  // ── 시장 환경 요약 ────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(25, 31, 40);
  doc.text('현재 시장 환경 요약', MARGIN, y);
  y += 5;

  const mktRows = [
    ['유동성 상태', data.marketContext.liquidityState],
    ['센티멘트 상태', data.marketContext.sentimentState],
    ['Kill Switch', data.marketContext.killSwitch],
  ];
  doc.setFontSize(8);
  for (const [label, value] of mktRows) {
    doc.setTextColor(78, 89, 104);
    doc.text(label, MARGIN + 2, y);
    doc.setTextColor(25, 31, 40);
    doc.text(value, MARGIN + 50, y);
    y += 4.5;
  }

  // ── 차트 이미지 ───────────────────────────────────────────────────────────
  if (data.chartImages.length > 0) {
    doc.addPage();
    y = MARGIN;
    doc.setFontSize(10);
    doc.setTextColor(25, 31, 40);
    doc.text('가격 차트', MARGIN, y);
    y += 6;

    for (const { title, dataUrl } of data.chartImages) {
      if (y > PAGE_H - MARGIN - 60) {
        doc.addPage();
        y = MARGIN;
      }
      doc.setFontSize(8);
      doc.setTextColor(78, 89, 104);
      doc.text(title, MARGIN, y);
      y += 3;
      const imgH = 65;
      doc.addImage(dataUrl, 'PNG', MARGIN, y, CONTENT_W, imgH);
      y += imgH + 6;
    }
  }

  // ── 푸터 ─────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(78, 89, 104);
    doc.text(`GreenBull Dashboard · Mock 데이터 기반 시뮬레이션 · ${p} / ${pageCount}`, MARGIN, PAGE_H - 6);
  }

  doc.save(`GreenBull_${data.symbol}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

interface ChartImage { title: string; dataUrl: string; }

interface MacroPdfData {
  serviceStatus: { status: string; label: string; updatedAt: string };
  liquidity: { state: string; totalScore: string; netLiquidityCurrent: string; netLiquidityMoM: string; liquidityFlowMoM: string };
  sentiment: { state: string; totalScore: string; vix: string; fearGreed: string; rationalEmotional: string; highYieldSpread: string; killSwitch: string };
  macroIndicators: Array<{ name: string; currentValue: number | null; unit: string; changeRate: number | null }>;
  chartImages: ChartImage[];
}

interface StockPdfData {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  changeRate: number;
  week52High: number;
  week52Low: number;
  valuation: { pe: number | null; forwardPe: number | null; pb: number | null; evEbitda: number | null; pegRatio: number | null; sectorPe: number | null; sectorPb: number | null; sectorEvEbitda: number | null };
  financials: { marketCap: number | null; eps: number | null; roe: number | null; debtRatio: number | null; dividendYield: number | null };
  marketContext: { liquidityState: string; sentimentState: string; killSwitch: string };
  chartImages: ChartImage[];
}

// ─── 리포트 선택 모달 ─────────────────────────────────────────────────────────

interface ReportOption {
  type: ReportType;
  icon: React.ReactNode;
  title: string;
  desc: string;
  items: string[];
}

function ReportSelectModal({
  onSelect,
  onClose,
}: {
  onSelect: (type: ReportType) => void;
  onClose: () => void;
}) {
  const options: ReportOption[] = [
    {
      type: 'macro',
      icon: <BarChart2 size={18} className="text-bull" />,
      title: '전체 매크로 리포트',
      desc: '현재 시장 전체 상태를 종합한 리포트',
      items: ['유동성 통합 지표', '시장 센티멘트', '주요 매크로 지표 (7개)', '서비스 상태 요약'],
    },
    {
      type: 'stock',
      icon: <FileText size={18} className="text-risk" />,
      title: '개별 종목 리포트',
      desc: '종목 상세 분석 섹션의 현재 데이터',
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
              <div className="flex items-center gap-2 mb-1">
                {opt.icon}
                <span className="text-sm font-semibold text-foreground">{opt.title}</span>
              </div>
              <p className="mb-2 text-xs text-market-neutral">{opt.desc}</p>
              <ul className="space-y-0.5">
                {opt.items.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-[10px] text-market-neutral/70">
                    <span className="size-1 rounded-full bg-market-neutral/40 flex-none" />
                    {item}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-market-neutral/50 text-center">
          차트 캡처 후 PDF 생성까지 수 초 소요될 수 있습니다
        </p>
      </div>
    </div>
  );
}

// ─── PdfExportButton (메인 컴포넌트) ─────────────────────────────────────────

export default function PdfExportButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const serviceStatus = useMarketStore(selectServiceStatus);
  const macroIndicators = useMarketStore(selectMacroData);
  const liquidityData = useMarketStore(selectLiquidityData);
  const sentimentData = useMarketStore(selectSentimentData);
  const liq = useLiquidityEngine();
  const sent = useSentimentEngine();

  async function handleSelect(type: ReportType) {
    setShowModal(false);
    setLoading(true);

    try {
      if (type === 'macro') {
        // 유동성 + 센티멘트 패널 캡처 시도
        const chartImages: ChartImage[] = [];
        const liquidityPanel = document.getElementById('liquidity');
        if (liquidityPanel) {
          try {
            const dataUrl = await captureElement(liquidityPanel);
            chartImages.push({ title: '유동성 지표 패널', dataUrl });
          } catch {}
        }
        const sentimentPanel = document.getElementById('sentiment');
        if (sentimentPanel) {
          try {
            const dataUrl = await captureElement(sentimentPanel);
            chartImages.push({ title: '시장 센티멘트 패널', dataUrl });
          } catch {}
        }

        await generateMacroPdf({
          serviceStatus: {
            status: serviceStatus.status,
            label: serviceStatus.label,
            updatedAt: serviceStatus.updatedAt,
          },
          liquidity: {
            state: liq.state,
            totalScore: liq.formatted.totalScore,
            netLiquidityCurrent: liq.formatted.netLiquidityCurrent,
            netLiquidityMoM: liq.formatted.netLiquidityMoM,
            liquidityFlowMoM: liq.formatted.liquidityFlowMoM,
          },
          sentiment: {
            state: sent.state,
            totalScore: sent.formatted.totalScore,
            vix: sent.formatted.vix,
            fearGreed: sent.formatted.fearGreed,
            rationalEmotional: sent.formatted.rationalEmotional,
            highYieldSpread: sent.formatted.highYieldSpread,
            killSwitch: sent.killSwitchActive ? `활성 (${sent.killSwitchReason ?? ''})` : '비활성',
          },
          macroIndicators: macroIndicators.map((ind) => ({
            name: ind.name,
            currentValue: ind.currentValue,
            unit: ind.unit,
            changeRate: ind.changeRate,
          })),
          chartImages,
        });
      } else {
        // 종목 리포트: stock 섹션 캡처
        const chartImages: ChartImage[] = [];
        const stockSection = document.getElementById('stock');
        if (stockSection) {
          try {
            const dataUrl = await captureElement(stockSection);
            chartImages.push({ title: '종목 상세 분석', dataUrl });
          } catch {}
        }

        // 선택된 종목이 없으면 첫 번째 유동성 지표를 대표 데이터로 사용
        const firstLiq = liquidityData.indicators[0];
        await generateStockPdf({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          currentPrice: 213.49,
          changeRate: 0.84,
          week52High: 237.23,
          week52Low: 164.08,
          valuation: { pe: 32.1, forwardPe: 28.4, pb: 48.2, evEbitda: 24.6, pegRatio: 2.1, sectorPe: 34.2, sectorPb: 12.8, sectorEvEbitda: 22.1 },
          financials: { marketCap: 3.2e12, eps: 6.65, roe: 147.3, debtRatio: 31.2, dividendYield: 0.44 },
          marketContext: {
            liquidityState: liq.state,
            sentimentState: sent.state,
            killSwitch: sent.killSwitchActive ? '활성' : '비활성',
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
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        <span className="hidden sm:inline">{loading ? 'PDF 생성 중...' : 'PDF'}</span>
      </button>

      {showModal && (
        <ReportSelectModal
          onSelect={handleSelect}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
