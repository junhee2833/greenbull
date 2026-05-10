import { useState, useEffect } from 'react';

// Returns mobileValue when viewport width is below the sm breakpoint (640 px),
// otherwise returns desktopValue. Updates on viewport resize.
export function useBreakpointValue<T>(mobileValue: T, desktopValue: T): T {
  const [value, setValue] = useState(desktopValue);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setValue(mq.matches ? mobileValue : desktopValue);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [mobileValue, desktopValue]);

  return value;
}
