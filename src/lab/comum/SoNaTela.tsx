import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** Stops the render loop while the canvas is off screen (scrolled to "Como funciona", another tab)
 *  and resumes it when it comes back, so phones spend no GPU on a scene nobody is looking at.
 *  The scene stays mounted: state (robot, city, boat) is kept, only frames stop. Goes inside <Canvas>. */
export function SoNaTela() {
  const el = useThree((s) => s.gl.domElement);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const alvo = el.parentElement ?? el;
    const loop = get().frameloop; // 'always' in the big scenes; read before we change it
    let naTela = true;
    const aplicar = () => {
      const novo = naTela && !document.hidden ? loop : 'never';
      if (get().frameloop !== novo) setFrameloop(novo); // setFrameloop restarts the clock, so only on change
    };
    const io = new IntersectionObserver(([e]) => { naTela = e.isIntersecting; aplicar(); }, { rootMargin: '64px' });
    io.observe(alvo);
    document.addEventListener('visibilitychange', aplicar);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', aplicar); setFrameloop(loop); };
  }, [el, setFrameloop, get]);

  return null;
}
