'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export default function Capybaras() {
  const scene = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let onscreen = false;
    const update = () => setVisible(onscreen && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; update(); });
    if (scene.current) observer.observe(scene.current);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  return <div ref={scene} className="capy-layer" data-moving={visible && !paused}>
    {[0, 1].map(index => <svg key={index} className={`capy-sprite capy-${index}`} viewBox="0 0 140 110" aria-hidden="true">
      <ellipse cx="70" cy="98" rx="48" ry="7" fill="#315440" opacity=".18" />
      <g className="capy-body" stroke="#795139" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M32 72v22q0 8 10 5l6-21m40-2v18q0 8 10 5l5-26" fill="#98704b" />
        <path d="M23 69c-5-30 19-42 44-32 19 7 32 24 31 44-24 10-63 6-75-12Z" fill="#b58a5c" />
        <path d="M69 40c-7-18 4-25 21-24 16 0 25 12 24 27l12 8q6 5 0 15c-6 9-37 11-47 1Z" fill="#c59a68" />
        <path d="M76 22c-12-13-20 1-11 10m29-14c-3-14 13-15 13 3" fill="#b58a5c" />
        <path d="M104 62q8 4 14-1" fill="none" strokeLinecap="round" />
        <ellipse className="capy-eye" cx="100" cy="40" rx="3" ry="3.6" fill="#382c25" stroke="none" />
        <ellipse cx="123" cy="51" rx="3" ry="2" fill="#795139" stroke="none" />
        <path d="M51 77v18q0 7 10 3l5-20" fill="#c59a68" />
        {index === 0 && <g stroke="none"><circle cx="85" cy="12" r="9" fill="#e8a13d" /><path d="M85 4q1-10 12-6-4 8-12 6" fill="#47774d" /></g>}
      </g>
    </svg>)}
    <button className="motion-toggle" type="button" aria-label={paused ? 'Retomar animações das capivaras' : 'Pausar animações das capivaras'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
  </div>;
}
