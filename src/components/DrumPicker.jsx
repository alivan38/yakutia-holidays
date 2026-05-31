import { useRef, useEffect, useCallback } from 'react';

const CLONES = [-3, -2, -1, 0, 1, 2, 3];

/** Ближайшая virtualPos для idx — кратчайший путь по кругу (влево/вправо). */
function nearestVirtualPos(currentVPos, targetIdx, n) {
  let best = targetIdx;
  let bestDist = Math.abs(targetIdx - currentVPos);
  for (const c of CLONES) {
    const candidate = c * n + targetIdx;
    const dist = Math.abs(candidate - currentVPos);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function findTargetEl(track, vPos, n) {
  return Array.from(track.querySelectorAll('.dp-item')).find(el =>
    parseInt(el.dataset.clone, 10) * n + parseInt(el.dataset.real, 10) === vPos
  );
}

const ANCHOR_TOP = 36;

function applyItemStyles(els, vPos, n) {
  els.forEach(el => {
    const c = parseInt(el.dataset.clone, 10);
    const r = parseInt(el.dataset.real, 10);
    const dist = c * n + r - vPos;
    el.classList.remove('dp-active', 'dp-adjacent', 'dp-before');
    el.style.opacity = '';
    if (dist < 0) {
      el.classList.add('dp-before');
      el.style.opacity = '0';
    } else if (dist === 0) el.classList.add('dp-active');
    else if (dist === 1) el.classList.add('dp-adjacent');
    else if (dist <= 2) el.style.opacity = '0.08';
    else el.style.opacity = '0';
  });
}

function centerActive(track, _container, targetEl) {
  const targetCenter = targetEl.offsetTop + targetEl.offsetHeight / 2;
  track.style.transform = `translateY(${ANCHOR_TOP - targetCenter}px)`;
}

// Бесконечный drum-picker (iOS-стиль, вертикальный)
// Props: items (string[]), value (string), onChange (fn), label (string)
export default function DrumPicker({ items, value, onChange, label }) {
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const scrollZoneRef = useRef(null);
  const stateRef = useRef({ virtualPos: 0, idx: 0 });
  const lastEmittedRef = useRef(value);
  const pendingRef = useRef({ raf: 0, wrapTimer: 0 });
  const scheduleCenterRef = useRef(null);

  const n = items.length;

  const cancelPending = useCallback(() => {
    const p = pendingRef.current;
    if (p.raf) cancelAnimationFrame(p.raf);
    if (p.wrapTimer) clearTimeout(p.wrapTimer);
    p.raf = 0;
    p.wrapTimer = 0;
  }, []);

  const scheduleCenter = useCallback((track, container, vPos, { animateWrap = true } = {}) => {
    cancelPending();

    const run = () => {
      pendingRef.current.raf = 0;
      const els = Array.from(track.querySelectorAll('.dp-item'));
      const targetEl = findTargetEl(track, vPos, n);

      if (!targetEl) {
        stateRef.current.virtualPos = stateRef.current.idx;
        applyItemStyles(els, stateRef.current.virtualPos, n);
        track.style.transition = 'none';
        pendingRef.current.wrapTimer = setTimeout(() => {
          pendingRef.current.wrapTimer = 0;
          track.style.transition = '';
          scheduleCenterRef.current?.(track, container, stateRef.current.virtualPos, { animateWrap: false });
        }, 30);
        return;
      }

      centerActive(track, container, targetEl);

      if (animateWrap && Math.abs(vPos) > 2 * n) {
        pendingRef.current.wrapTimer = setTimeout(() => {
          pendingRef.current.wrapTimer = 0;
          track.style.transition = 'none';
          stateRef.current.virtualPos = ((stateRef.current.virtualPos % n) + n) % n;
          stateRef.current.idx = stateRef.current.virtualPos;
          applyItemStyles(Array.from(track.querySelectorAll('.dp-item')), stateRef.current.virtualPos, n);

          pendingRef.current.raf = requestAnimationFrame(() => {
            pendingRef.current.raf = requestAnimationFrame(() => {
              pendingRef.current.raf = 0;
              const wrapped = findTargetEl(track, stateRef.current.virtualPos, n);
              if (wrapped) centerActive(track, container, wrapped);
              setTimeout(() => { track.style.transition = ''; }, 30);
            });
          });
        }, 520);
      }
    };

    // Двойной rAF: дождаться layout после смены dp-active (размер шрифта)
    pendingRef.current.raf = requestAnimationFrame(() => {
      pendingRef.current.raf = requestAnimationFrame(run);
    });
  }, [n, cancelPending]);

  useEffect(() => {
    scheduleCenterRef.current = scheduleCenter;
  }, [scheduleCenter]);

  const renderTrack = useCallback((opts = {}) => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container || n === 0) return;

    const vPos = stateRef.current.virtualPos;
    applyItemStyles(Array.from(track.querySelectorAll('.dp-item')), vPos, n);
    scheduleCenter(track, container, vPos, opts);
  }, [n, scheduleCenter]);

  const step = useCallback((dir) => {
    stateRef.current.virtualPos += dir;
    stateRef.current.idx = ((stateRef.current.virtualPos % n) + n) % n;
    renderTrack();
    lastEmittedRef.current = items[stateRef.current.idx];
    onChange(items[stateRef.current.idx]);
  }, [n, items, onChange, renderTrack]);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    const idx = items.indexOf(value);
    if (idx >= 0) {
      stateRef.current.virtualPos = nearestVirtualPos(stateRef.current.virtualPos, idx, n);
      stateRef.current.idx = idx;
      const track = trackRef.current;
      if (track) track.style.transition = 'none';
      renderTrack({ animateWrap: false });
      requestAnimationFrame(() => {
        if (trackRef.current) trackRef.current.style.transition = '';
      });
    }
  }, [value, items, renderTrack]);

  const itemsKey = items.join('\0');
  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0) {
      stateRef.current.idx = idx;
      stateRef.current.virtualPos = nearestVirtualPos(stateRef.current.virtualPos, idx, n);
    }
    renderTrack({ animateWrap: false });
  }, [itemsKey, renderTrack, value, n]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => renderTrack({ animateWrap: false }));
    ro.observe(container);
    return () => ro.disconnect();
  }, [renderTrack]);

  useEffect(() => {
    const zone = scrollZoneRef.current;
    if (!zone) return;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      step(e.deltaY > 0 ? 1 : -1);
    };
    zone.addEventListener('wheel', onWheel, { passive: false });
    return () => zone.removeEventListener('wheel', onWheel);
  }, [step]);

  useEffect(() => {
    const zone = scrollZoneRef.current;
    if (!zone) return;
    let startY = null;
    let moved = 0;
    const onDown = (e) => { startY = e.clientY; moved = 0; };
    const onMove = (e) => {
      if (startY == null) return;
      moved += e.clientY - startY;
      startY = e.clientY;
      if (Math.abs(moved) > 45) { step(moved < 0 ? 1 : -1); moved = 0; }
    };
    const onUp = () => { startY = null; };
    zone.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    let touchStartY = null;
    const onTouchStart = (e) => { touchStartY = e.touches[0].clientY; moved = 0; };
    const onTouchMove = (e) => {
      if (touchStartY == null) return;
      const dy = e.touches[0].clientY - touchStartY;
      touchStartY = e.touches[0].clientY;
      moved += dy;
      if (Math.abs(moved) > 34) { step(dy < 0 ? 1 : -1); moved = 0; }
    };
    zone.addEventListener('touchstart', onTouchStart, { passive: true });
    zone.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      zone.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      zone.removeEventListener('touchstart', onTouchStart);
      zone.removeEventListener('touchmove', onTouchMove);
    };
  }, [step]);

  useEffect(() => () => cancelPending(), [cancelPending]);

  return (
    <div className="dp-picker">
      {label && (
        <>
          <div className="dp-label">{label}</div>
          <div className="dp-label-divider" aria-hidden="true" />
        </>
      )}
      <div className="dp-container" ref={containerRef}>
        <div
          className="dp-scroll-zone"
          ref={scrollZoneRef}
          aria-hidden="true"
        />
      <div className="dp-track" ref={trackRef}>
        {CLONES.map(c =>
          items.map((item, i) => (
            <div
              key={`${c}-${i}`}
              className="dp-item"
              data-clone={c}
              data-real={i}
              onClick={() => {
                stateRef.current.virtualPos = nearestVirtualPos(stateRef.current.virtualPos, i, n);
                stateRef.current.idx = i;
                renderTrack();
                lastEmittedRef.current = item;
                onChange(item);
              }}
            >
              {item}
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
}
