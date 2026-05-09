'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ChartHintTooltip() {
  const [open,    setOpen]    = useState(false);
  const [hovered, setHovered] = useState(false);
  const show = open || hovered;
  const ref  = useRef<HTMLSpanElement>(null);

  // 모바일: 바깥 터치 시 닫기
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex flex-none items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      <AlertCircle
        size={15}
        className={`cursor-pointer transition-colors duration-150 ${
          show ? 'text-gray-600' : 'text-gray-400'
        } hover:text-gray-600`}
      />

      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 5,  scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-gray-900 px-4 py-3 shadow-xl"
          >
            <p className="text-xs leading-relaxed text-white">
              카드를 탭하여 자세한 차트를 볼 수 있습니다.
            </p>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
