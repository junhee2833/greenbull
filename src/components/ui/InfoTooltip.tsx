import { HelpCircle } from 'lucide-react';

export default function InfoTooltip({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span
      className="group/info relative inline-flex flex-none items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <HelpCircle
        size={12}
        className="cursor-help text-market-neutral/35 transition-colors group-hover/info:text-market-neutral/65"
      />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 whitespace-normal rounded-xl border border-border bg-white px-3 py-2.5 text-[11px] leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100">
        {text}
      </span>
    </span>
  );
}
