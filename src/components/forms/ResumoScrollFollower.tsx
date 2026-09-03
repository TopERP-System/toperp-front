import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

/** Mantém o painel de resumo visível ao rolar (desktop). */
export function ResumoScrollFollower({
  children,
  topOffset = 80,
}: {
  children: ReactNode;
  topOffset?: number;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [spacerHeight, setSpacerHeight] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');

    const update = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel || !mq.matches) {
        setPanelStyle({});
        setSpacerHeight(0);
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const panelWidth = anchor.offsetWidth;

      if (anchorRect.top > topOffset) {
        setPanelStyle({});
        setSpacerHeight(0);
        return;
      }

      setSpacerHeight(panelHeight);

      const bottomLimit = anchorRect.bottom - panelHeight;
      const fixedTop = bottomLimit < topOffset ? bottomLimit : topOffset;

      setPanelStyle({
        position: 'fixed',
        top: fixedTop,
        left: anchorRect.left,
        width: panelWidth,
        zIndex: 30,
      });
    };

    const onScroll = () => requestAnimationFrame(update);
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => requestAnimationFrame(update))
        : null;

    mq.addEventListener('change', update);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', update);
    if (panelRef.current && ro) ro.observe(panelRef.current);
    if (anchorRef.current && ro) ro.observe(anchorRef.current);
    update();

    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [topOffset]);

  return (
    <div ref={anchorRef} className="relative h-full w-full lg:min-h-full">
      {spacerHeight > 0 ? (
        <div style={{ height: spacerHeight }} aria-hidden="true" className="hidden lg:block" />
      ) : null}
      <div ref={panelRef} style={panelStyle} className="space-y-4">
        {children}
      </div>
    </div>
  );
}
