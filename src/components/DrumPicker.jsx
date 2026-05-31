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

function applyItemStyles(els, vPos, n) {
  els.forEach(el => {
    const c = parseInt(el.dataset.clone, 10);
    const r = parseInt(el.dataset.real, 10);
    const dist = c * n + r - vPos;
    el.classList.remove('dp-active', 'dp-adjacent');
    el.style.opacity = '';
    if (dist === 0) el.classList.add('dp-active');
    else if (Math.abs(dist) === 1) el.classList.add('dp-adjacent');
    else if (Math.abs(dist) <= 2) el.style.opacity = '0.08';
    else el.style.opacity = '0';
  });
}

function centerActive(track, container, targetEl) {
  const targetCenter = targetEl.offsetLeft + targetEl.offsetWidth / 2;
  const containerCenter = container.offsetWidth / 2;
  track.style.transform = `translateX(${containerCenter - targetCenter}px)`;
}

// Бесконечный drum-picker (iOS-стиль)
// Props: items (string[]), value (string), onChange (fn)
export default function DrumPicker({ items, value, onChange }) {
  const trackRef = useRef(null);
  const containerRef = useRef(null);
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
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e) => {
      const rect = container.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      if (relX < rect.width / 3 || relX > rect.width * 2 / 3) return;
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [step]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let startX = null, moved = 0;
    const onDown = (e) => { startX = e.clientX; moved = 0; };
    const onMove = (e) => {
      if (startX == null) return;
      moved += e.clientX - startX;
      startX = e.clientX;
      if (Math.abs(moved) > 60) { step(moved < 0 ? 1 : -1); moved = 0; }
    };
    const onUp = () => { startX = null; };
    container.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    let touchStartX = null;
    const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; moved = 0; };
    const onTouchMove = (e) => {
      if (touchStartX == null) return;
      const dx = e.touches[0].clientX - touchStartX;
      touchStartX = e.touches[0].clientX;
      moved += dx;
      if (Math.abs(moved) > 40) { step(dx < 0 ? 1 : -1); moved = 0; }
    };
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      container.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, [step]);

  useEffect(() => () => cancelPending(), [cancelPending]);

  return (
    <div className="dp-container" ref={containerRef}>
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
  );
}
