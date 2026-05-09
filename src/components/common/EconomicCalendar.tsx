'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ECONOMIC_EVENTS, type EconomicEvent, type EventImportance, type EventType } from '@/src/mocks/calendarData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const IMPORTANCE_CONFIG: Record<EventImportance, { bg: string; text: string; border: string; dot: string }> = {
  high:   { bg: 'bg-bear/15',  text: 'text-bear',          border: 'border-bear/30',  dot: 'bg-bear'  },
  medium: { bg: 'bg-risk/15',  text: 'text-risk',          border: 'border-risk/30',  dot: 'bg-risk'  },
  low:    { bg: 'bg-surface',  text: 'text-market-neutral', border: 'border-border',   dot: 'bg-market-neutral' },
};

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  FOMC:     'FOMC',
  CPI:      'CPI',
  PCE:      'PCE',
  NFP:      '고용',
  GDP:      'GDP',
  PMI:      'PMI',
  RETAIL:   '소매판매',
  EARNINGS: '실적',
  OTHER:    '기타',
};

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=일
  const days: (Date | null)[] = [];

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, -startPad + i + 1);
    days.push(d);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // 6줄(42칸)이 되도록 다음 달 날짜로 패딩
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push(new Date(year, month + 1, d));
  }
  return days;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isToday(date: Date): boolean {
  const today = new Date('2026-05-07'); // Mock 기준일
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// ─── Event Badge ──────────────────────────────────────────────────────────────

function EventBadge({ event, compact }: { event: EconomicEvent; compact?: boolean }) {
  const cfg = IMPORTANCE_CONFIG[event.importance];
  return (
    <span
      className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium leading-none truncate ${cfg.bg} ${cfg.text}`}
      title={event.eventTitle}
    >
      <span className={`size-1.5 flex-none rounded-full ${cfg.dot}`} />
      {compact ? EVENT_TYPE_LABEL[event.eventType] : event.eventTitle}
    </span>
  );
}

// ─── Day Cell ─────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 2;

function DayCell({
  date,
  currentMonth,
  events,
  onClick,
}: {
  date: Date;
  currentMonth: number;
  events: EconomicEvent[];
  onClick: (date: Date, events: EconomicEvent[]) => void;
}) {
  const isCurrentMonth = date.getMonth() === currentMonth;
  const today = isToday(date);
  const hasEvents = events.length > 0;
  const visible = events.slice(0, MAX_VISIBLE);
  const overflow = events.length - MAX_VISIBLE;

  return (
    <div
      onClick={() => hasEvents && onClick(date, events)}
      className={[
        'min-h-[80px] rounded-lg border p-1.5 transition-colors',
        isCurrentMonth ? 'bg-card border-border' : 'bg-surface/40 border-border/40',
        hasEvents ? 'cursor-pointer hover:bg-card-hover' : '',
      ].join(' ')}
    >
      {/* 날짜 숫자 */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={[
            'flex size-6 items-center justify-center rounded-full text-xs font-medium',
            today
              ? 'bg-bull text-white font-bold'
              : isCurrentMonth
              ? 'text-foreground'
              : 'text-market-neutral/40',
          ].join(' ')}
        >
          {date.getDate()}
        </span>
      </div>

      {/* 이벤트 Badge 목록 */}
      <div className="space-y-0.5">
        {visible.map((ev) => (
          <EventBadge key={ev.id} event={ev} compact />
        ))}
        {overflow > 0 && (
          <span className="block px-1 text-[9px] text-market-neutral/70">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Day Detail Modal ─────────────────────────────────────────────────────────

function DayModal({
  date,
  events,
  onClose,
}: {
  date: Date;
  events: EconomicEvent[];
  onClose: () => void;
}) {
  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const sorted = [...events].sort((a, b) => {
    const importanceOrder: Record<EventImportance, number> = { high: 0, medium: 1, low: 2 };
    const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
    if (impDiff !== 0) return impDiff;
    return (a.eventTime ?? '').localeCompare(b.eventTime ?? '');
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{dateStr}</p>
            <p className="mt-0.5 text-xs text-market-neutral">{events.length}개 이벤트</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-market-neutral hover:bg-surface hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sorted.map((ev) => {
            const cfg = IMPORTANCE_CONFIG[ev.importance];
            const importanceLabel: Record<EventImportance, string> = { high: '높음', medium: '중간', low: '낮음' };
            return (
              <div
                key={ev.id}
                className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${cfg.text}`}>{ev.eventTitle}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="text-[10px] text-market-neutral">
                        {EVENT_TYPE_LABEL[ev.eventType]}
                      </span>
                      {ev.eventTime && (
                        <span className="text-[10px] text-market-neutral">
                          {ev.eventTime} ET
                        </span>
                      )}
                      <span className={`text-[10px] font-medium ${cfg.text}`}>
                        중요도 {importanceLabel[ev.importance]}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-market-neutral/70">
                      관련: {ev.relatedAsset}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-market-neutral">
                  {ev.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── EconomicCalendar ─────────────────────────────────────────────────────────

export default function EconomicCalendar() {
  const [viewDate, setViewDate] = useState(() => new Date(2026, 4, 1)); // 2026-05 기준
  const [modalState, setModalState] = useState<{ date: Date; events: EconomicEvent[] } | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calDays = useMemo(() => buildCalendarDays(year, month), [year, month]);

  // 날짜 → 이벤트 맵
  const eventMap = useMemo(() => {
    const map: Record<string, EconomicEvent[]> = {};
    for (const ev of ECONOMIC_EVENTS) {
      if (!map[ev.eventDate]) map[ev.eventDate] = [];
      map[ev.eventDate].push(ev);
    }
    return map;
  }, []);

  const monthLabel = viewDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
          <p className="mt-0.5 text-[10px] text-market-neutral">주요 경제 이벤트 캘린더 · 시각 기준: ET (미국 동부 시간)</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-market-neutral hover:bg-surface hover:text-foreground"
            aria-label="이전 달"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-market-neutral hover:bg-surface hover:text-foreground"
            aria-label="다음 달"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 중요도 범례 */}
      <div className="mb-4 flex flex-wrap gap-3">
        {(['high', 'medium', 'low'] as EventImportance[]).map((imp) => {
          const cfg = IMPORTANCE_CONFIG[imp];
          const label: Record<EventImportance, string> = { high: '높음', medium: '중간', low: '낮음' };
          return (
            <span key={imp} className="flex items-center gap-1.5 text-[10px] text-market-neutral">
              <span className={`size-2 rounded-full ${cfg.dot}`} />
              중요도 {label[imp]}
            </span>
          );
        })}
      </div>

      {/* 요일 헤더 */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-1 text-center text-[10px] font-medium ${
              i === 0 ? 'text-bear/70' : i === 6 ? 'text-bull/70' : 'text-market-neutral'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calDays.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = toDateKey(date);
          const events = eventMap[key] ?? [];
          return (
            <DayCell
              key={key + '-' + i}
              date={date}
              currentMonth={month}
              events={events}
              onClick={(d, evs) => setModalState({ date: d, events: evs })}
            />
          );
        })}
      </div>

      {/* 이벤트 상세 모달 */}
      {modalState && (
        <DayModal
          date={modalState.date}
          events={modalState.events}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
