import { useRef, useEffect, useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';

function buildOutlinePaths(w, h, radius = 6) {
  if (w < 4 || h < 4) return { left: '', right: '' };
  const pad = 1;
  const x0 = pad;
  const y0 = pad;
  const x1 = w - pad;
  const y1 = h - pad;
  const cx = w / 2;
  const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2);

  const left = [
    `M ${cx} ${y1}`,
    `L ${x0 + r} ${y1}`,
    `Q ${x0} ${y1} ${x0} ${y1 - r}`,
    `L ${x0} ${y0 + r}`,
    `Q ${x0} ${y0} ${x0 + r} ${y0}`,
    `L ${cx} ${y0}`,
  ].join(' ');

  const right = [
    `M ${cx} ${y1}`,
    `L ${x1 - r} ${y1}`,
    `Q ${x1} ${y1} ${x1} ${y1 - r}`,
    `L ${x1} ${y0 + r}`,
    `Q ${x1} ${y0} ${x1 - r} ${y0}`,
    `L ${cx} ${y0}`,
  ].join(' ');

  return { left, right };
}

export default function NavbarLinkItem({ to, end, children, classNameBase = 'navbar-link' }) {
  const innerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  const paths = useMemo(
    () => buildOutlinePaths(size.w, size.h),
    [size.w, size.h],
  );

  const pathClass = (isActive) =>
    `${classNameBase}__path${isActive ? ` ${classNameBase}__path--on` : ''}`;

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${classNameBase}${isActive ? ` ${classNameBase}--active` : ''}`
      }
    >
      {({ isActive }) => (
        <span className={`${classNameBase}__inner`} ref={innerRef}>
          <span className={`${classNameBase}__text`}>{children}</span>
          {paths.left && paths.right && (
            <svg
              className={`${classNameBase}__outline`}
              width={size.w}
              height={size.h}
              aria-hidden="true"
            >
              <path
                key={isActive ? 'active-l' : 'idle-l'}
                d={paths.left}
                pathLength="1"
                className={pathClass(isActive)}
              />
              <path
                key={isActive ? 'active-r' : 'idle-r'}
                d={paths.right}
                pathLength="1"
                className={pathClass(isActive)}
              />
            </svg>
          )}
        </span>
      )}
    </NavLink>
  );
}
