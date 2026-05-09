import type { Metadata } from 'next';
import NavBar from '@/src/components/layout/NavBar';
import Footer from '@/src/components/layout/Footer';
import EconomicCalendar from '@/src/components/common/EconomicCalendar';

export const metadata: Metadata = {
  title: '경제 이벤트 캘린더 — GreenBull Dashboard',
  description: '미국 주식 장기투자자를 위한 주요 경제 이벤트 일정 및 예정 발표 캘린더',
};

export default function CalendarPage() {
  return (
    <>
      <NavBar />

      <main className="min-h-screen pt-20 pb-24">
        <div className="mx-auto max-w-360 px-6 md:px-10 lg:px-16">

          {/* 페이지 헤더 */}
          <div className="mb-8 flex items-center gap-3">
            <span className="size-2 flex-none rounded-full bg-market-neutral" />
            <h1 className="text-base font-semibold text-foreground">경제 이벤트 캘린더</h1>
            <div className="h-px flex-1 bg-border" />
          </div>

          <EconomicCalendar />
        </div>
      </main>

      <Footer />
    </>
  );
}
