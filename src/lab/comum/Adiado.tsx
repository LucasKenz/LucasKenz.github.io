import { useEffect, useState, type ComponentType } from 'react';
import type { Lang } from '@content/types';

// The 3D scenes weigh ~1.3 MB of JS (three + postprocessing). Load them only after the page has
// painted and the browser is idle, showing the poster meanwhile, so text appears first on slow phones.
const cenas = {
  mover: () => import('../mover/Mover'),
  seguros: () => import('../dados/Barras3D'),
  banco: () => import('../dados/Barras3D'),
  farma: () => import('../dados/Barras3D'),
  energia: () => import('../dados/Barras3D'),
  cidade: () => import('../cidade/Cidade'),
  robo: () => import('../robo/Robo'),
  agua: () => import('../agua/Agua'),
};

interface Props { cena: keyof typeof cenas; lang: Lang; poster: string }

export default function Adiado({ cena, lang, poster }: Props) {
  const [Cena, setCena] = useState<ComponentType<{ lang: Lang; slug?: string }> | null>(null);

  useEffect(() => {
    let vivo = true;
    const carregar = () => cenas[cena]().then((m) => vivo && setCena(() => m.default));
    const ocioso = () => ('requestIdleCallback' in window ? requestIdleCallback(carregar, { timeout: 1500 }) : setTimeout(carregar, 200));
    if (document.readyState === 'complete') ocioso();
    else addEventListener('load', ocioso, { once: true });
    return () => { vivo = false; removeEventListener('load', ocioso); };
  }, [cena]);

  if (Cena) return <Cena lang={lang} slug={cena} />;
  return (
    <div className="lab-palco lab-espera" style={{ backgroundImage: `url(${poster})` }}>
      <span role="status">{lang === 'pt' ? 'Carregando a cena 3D…' : 'Loading the 3D scene…'}</span>
    </div>
  );
}
