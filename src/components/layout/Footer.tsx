// ─── Data source attribution ──────────────────────────────────────────────────

const DATA_SOURCES = [
  'Yahoo Finance',
  'FRED',
  'Reddit',
  'Polymarket',
  'CNN Business',
  'Google Finance',
] as const;

// ─── Footer ───────────────────────────────────────────────────────────────────

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-360 px-6 md:px-10 lg:px-16 py-10 md:py-12">

        {/* ── Top row ── */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">

          {/* Brand */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                GreenBull Dashboard
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#8B95A1]">
              미국 주식 장기투자자를 위한<br />
              매크로·유동성·센티멘트 통합 분석 대시보드
            </p>
          </div>

          {/* Developer */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B95A1]">
              제작
            </p>
            <div className="flex items-center gap-1.5">
              <a
                href="https://www.linkedin.com/in/junhee-lee-728465275/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#4E5968] hover:text-bull transition-colors"
              >
                이준희
              </a>
              <span className="text-[#8B95A1]">·</span>
              <span className="text-xs text-[#4E5968]">송유찬</span>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-6 border-t border-border-subtle" />

        {/* ── Bottom row ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* Data attribution */}
          <p className="text-[11px] text-[#8B95A1] leading-relaxed">
            <span className="font-medium text-[#4E5968]">데이터 출처</span>
            {' '}
            {DATA_SOURCES.join(' · ')}
          </p>

          {/* Copyright + version */}
          <p className="shrink-0 text-[11px] text-[#8B95A1]">
            © 2026 GreenBull Dashboard · Team_상팔
          </p>
        </div>

      </div>
    </footer>
  );
}
