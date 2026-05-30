import { useRef, useEffect, useCallback, useState } from 'react';

// Бесконечный drum-picker (iOS-стиль)
// Props: items (string[]), value (string), onChange (fn)
export default function DrumPicker({ items, value, onChange }) {
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef({ virtualPos: 0, idx: 0 });

  const n = items.length;

  const renderTrack = useCallback(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;
    const items_els = Array.from(track.querySelectorAll('.dp-item'));
    const vPos = stateRef.current.virtualPos;

    items_els.forEach(el => {
      const c = parseInt(el.dataset.clone);
      const r = parseInt(el.dataset.real);
      const absPos = c * n + r;
      const dist = absPos - vPos;
      el.classList.remove('dp-active', 'dp-adjacent');
      el.style.opacity = '';
      if (dist === 0) el.classList.add('dp-active');
      else if (Math.abs(dist) === 1) el.classList.add('dp-adjacent');
      else if (Math.abs(dist) <= 2) el.style.opacity = '0.08';
      else el.style.opacity = '0';
    });

    const targetEl = items_els.find(el =>
      parseInt(el.dataset.clone) * n + parseInt(el.dataset.real) === vPos
    );
    if (!targetEl) {
      stateRef.current.virtualPos = stateRef.current.idx;
      track.style.transition = 'none';
      setTimeout(() => { track.style.transition = ''; renderTrack(); }, 30);
      return;
    }

    let offset = 0;
    items_els.forEach(el => {
      const abs = parseInt(el.dataset.clone) * n + parseInt(el.dataset.real);
      if (abs < vPos) offset += el.offsetWidth;
    });
    offset += targetEl.offsetWidth / 2;
    const cW = container.offsetWidth;
    track.style.transform = `translateX(${cW / 2 - offset}px)`;

    if (Math.abs(vPos) > 2 * n) {
      setTimeout(() => {
        track.style.transition = 'none';
        stateRef.current.virtualPos = stateRef.current.virtualPos % n;
        if (stateRef.current.virtualPos < 0) stateRef.current.virtualPos += n;
        renderTrack();
        setTimeout(() => { if (track) track.style.transition = ''; }, 30);
      }, 520);
    }
  }, [n]);

  const step = useCallback((dir) => {
    stateRef.current.virtualPos += dir;
    stateRef.current.idx = ((stateRef.current.virtualPos % n) + n) % n;
    renderTrack();
    onChange(items[stateRef.current.idx]);
  }, [n, items, onChange, renderTrack]);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0) {
      stateRef.current.virtualPos = idx;
      stateRef.current.idx = idx;
      renderTrack();
    }
  }, [value, items, renderTrack]);

  // Wheel (только по центральной трети)
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

  // Drag (mouse + touch)
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

  useEffect(() => { renderTrack(); }, [renderTrack]);

  const clones = [-3, -2, -1, 0, 1, 2, 3];

  return (
    <div className="dp-container" ref={containerRef}>
      <div className="dp-track" ref={trackRef}>
        {clones.map(c =>
          items.map((item, i) => (
            <div
              key={`${c}-${i}`}
              className="dp-item"
              data-clone={c}
              data-real={i}
              onClick={() => {
                const abs = c * n + i;
                const diff = abs - stateRef.current.virtualPos;
                stateRef.current.virtualPos += diff;
                stateRef.current.idx = i;
                renderTrack();
                onChange(item);
              }}
            >
              {item}
            </div>
          ))
        )}
      </div>
      <div className="dp-fade-left" />
      <div className="dp-fade-right" />
    </div>
  );
}
