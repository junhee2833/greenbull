'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMarketStore, selectServiceStatus } from '@/src/store/useMarketStore';
import PdfExportButton from '@/src/components/common/PdfExportButton';

// ─── Section manifest ─────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'macro',     label: '매크로' },
  { id: 'liquidity', label: '유동성' },
  { id: 'sentiment', label: '시장 센티멘트' },
  { id: 'sector',    label: '산업' },
  { id: 'stock',     label: '종목' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// 실제 헤더 높이 — 스크롤 위치 감지(active section)에 사용
const NAV_HEIGHT = 56;
// 섹션 이동 시 오프셋 — 헤더(56px) + 여백(24px) = 80px (8px 단위 ×10)
const SCROLL_OFFSET = 80;

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  normal:  { dot: 'bg-bull',  badge: 'bg-bull/10 text-bull border-bull/20',  label: '정상' },
  delayed: { dot: 'bg-risk',  badge: 'bg-risk/10 text-risk border-risk/20',  label: '지연' },
  error:   { dot: 'bg-bear',  badge: 'bg-bear/10 text-bear border-bear/20',  label: '장애' },
} as const;

function ServiceStatusBadge() {
  const { status } = useMarketStore(selectServiceStatus);
  const { dot, badge, label } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge}`}>
      <span className={`size-1.5 rounded-full ${dot} animate-pulse`} />
      {label}
    </span>
  );
}

function UpdatedAt() {
  const { updatedAt } = useMarketStore(selectServiceStatus);
  const time = new Date(updatedAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <span className="text-xs text-market-neutral hidden md:block">
      업데이트 {time}
    </span>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────

export default function NavBar() {
  const [activeSection, setActiveSection] = useState<SectionId>('macro');

  useEffect(() => {
    const handleScroll = () => {
      const trigger = window.scrollY + NAV_HEIGHT + 32;
      let current: SectionId = 'macro';
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= trigger) current = section.id;
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white border-b border-border-subtle">
      <div className="mx-auto flex h-14 max-w-360 items-stretch px-6 md:px-10 lg:px-16">

        {/* 로고 */}
        <div className="flex items-center gap-2 flex-none pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.ico" alt="GreenBull" className="size-7 object-contain" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            GreenBull{' '}
            <span className="font-normal text-market-neutral">Dashboard</span>
          </span>
        </div>

        {/* 섹션 내비게이션 — 헤더 내 통합 */}
        <nav
          className="flex flex-1 items-stretch overflow-x-auto"
          aria-label="섹션 내비게이션"
        >
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={[
                  'relative flex items-center flex-none whitespace-nowrap px-4 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[#191F28] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#3182F6]'
                    : 'text-[#4E5968] hover:text-[#191F28]',
                ].join(' ')}
                aria-current={isActive ? 'true' : undefined}
              >
                {section.label}
              </button>
            );
          })}

          {/* 캘린더 — 새 탭 전용 페이지 */}
          <a
            href="/calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center flex-none whitespace-nowrap px-4 text-sm font-medium text-[#4E5968] transition-colors hover:text-[#191F28]"
          >
            캘린더
          </a>

          {/* About — 외부 Notion 링크, 새 탭 */}
          <a
            href="https://mixed-sawfish-59b.notion.site/GreenBull-Dashboard-35a7165ff804805b8ea5cc9ccfabe95d?source=copy_link"
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center flex-none whitespace-nowrap px-4 text-sm font-medium text-[#4E5968] transition-colors hover:text-[#191F28]"
          >
            서비스 소개
          </a>
        </nav>

        {/* 우측 액션 영역 */}
        <div className="flex items-center gap-2 flex-none">
          <UpdatedAt />
          <ServiceStatusBadge />
          <PdfExportButton />
        </div>

      </div>
    </header>
  );
}
