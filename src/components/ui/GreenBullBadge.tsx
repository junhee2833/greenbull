export default function GreenBullBadge() {
  return (
    <span className="group/gb relative inline-flex flex-none items-center">
      <span className="cursor-default rounded border border-bull/30 bg-bull/10 px-1 py-0.5 text-[9px] font-bold text-bull">
        GreenBull
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-36 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border bg-white px-3 py-2 text-[11px] leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover/gb:opacity-100">
        GreenBull 자체 설계 지표
      </span>
    </span>
  );
}
