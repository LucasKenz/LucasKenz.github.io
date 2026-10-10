import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useModo } from '../comum/Pos';
import { COC_FF, desfoque, distanciaImagem, lenteBiconvexa, profundidade, tracar } from './optica';

type Lang = 'pt' | 'en';
// The 3D viewfinder (three.js) loads only in Visual mode; Light mode keeps the SVG one.
const Visor3D = lazy(() => import('./Visor3D'));
const ABERTURAS = [1.8, 2, 2.8, 4, 5.6, 8, 11, 16];
const FOCAIS = [24, 50, 85];
const OBJETOS = [
  { id: 'xicara', d: 800, cor: '#ef5b5b', nome: { pt: 'xícara', en: 'cup' } },
  { id: 'planta', d: 2000, cor: '#2e9b62', nome: { pt: 'planta', en: 'plant' } },
  { id: 'janela', d: 8000, cor: '#2f5bea', nome: { pt: 'janela', en: 'window' } },
] as const;

// Focus ring: slider 0..1000 mapped to 0.3 m .. infinity on a 1/d scale (like a real ring).
const MIN_FOCO = 300;
const anelParaDist = (v: number) => (v >= 1000 ? Infinity : 1 / ((1 - v / 1000) / MIN_FOCO));
const distParaAnel = (d: number) => (d === Infinity ? 1000 : Math.round((1 - MIN_FOCO / d) * 1000));
const m = (mm: number, lang: Lang) => (mm === Infinity ? '∞' : `${(mm / 1000).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en', { maximumFractionDigits: 2 })} m`);

const tarefas = [
  {
    id: 1,
    texto: { pt: 'Deixe só a xícara nítida.', en: 'Make only the cup sharp.' },
    dica: { pt: 'Aproxime o foco e abra o diafragma (f pequeno).', en: 'Bring focus close and open the aperture (small f).' },
    ok: (b: number[]) => b[0] <= COC_FF && b[1] > COC_FF * 2 && b[2] > COC_FF * 2,
  },
  {
    id: 2,
    texto: { pt: 'Deixe as três nítidas ao mesmo tempo.', en: 'Make all three sharp at once.' },
    dica: { pt: 'Use 24 mm, feche para f/16 e foque perto da hiperfocal.', en: 'Use 24 mm, stop down to f/16 and focus near the hyperfocal distance.' },
    ok: (b: number[]) => b.every((x) => x <= COC_FF),
  },
  {
    id: 3,
    texto: { pt: 'Xícara nítida e fundo bem desfocado (mais de 0,5 mm).', en: 'Sharp cup and a very blurred background (over 0.5 mm).' },
    dica: { pt: '85 mm em f/1.8, foco na xícara.', en: '85 mm at f/1.8, focus on the cup.' },
    ok: (b: number[]) => b[0] <= COC_FF && b[2] > 0.5,
  },
  {
    id: 4,
    texto: { pt: 'Só a janela nítida: foco no infinito.', en: 'Only the window sharp: focus at infinity.' },
    dica: { pt: 'Gire o anel até o fim e abra o diafragma.', en: 'Turn the ring all the way and open the aperture.' },
    ok: (b: number[]) => b[2] <= COC_FF && b[0] > COC_FF * 2,
  },
];

/** Cross-section: lens, diaphragm, sensor and traced rays from each object (mm units). */
function Bancada({ f, N, s, lang, brilho }: { f: number; N: number; s: number; lang: Lang; brilho: boolean }) {
  const geo = lenteBiconvexa(f);
  const v = distanciaImagem(f, s);
  const sensorX = 140;
  const centro = sensorX - v;
  const L = { ...geo, x0: centro - geo.espessura / 2 };
  const raioAbertura = Math.min(f / N / 2, geo.abertura);
  const xMin = centro - 70;
  const raios = OBJETOS.flatMap((o) =>
    [-1, -0.5, 0.5, 1].map((k) => {
      const h = raioAbertura * k;
      const origem = { x: L.x0 - o.d, y: 0 };
      const alvo = { x: L.x0, y: h };
      const len = Math.hypot(alvo.x - origem.x, alvo.y - origem.y);
      const d = { x: (alvo.x - origem.x) / len, y: (alvo.y - origem.y) / len };
      const pts = tracar(origem, d, L, sensorX + 10);
      if (!pts) return null;
      // Clip the incoming segment to the drawing.
      const t = (xMin - origem.x) / d.x;
      pts[0] = { x: xMin, y: origem.y + d.y * t };
      return { cor: o.cor, pts };
    }),
  ).filter(Boolean) as { cor: string; pts: { x: number; y: number }[] }[];

  // Lens outline from the two spherical caps.
  const R = geo.raio;
  const a = geo.abertura;
  const sag = R - Math.sqrt(R * R - a * a);
  const x1 = L.x0;
  const x2 = L.x0 + geo.espessura;
  const lente = `M ${x1 + sag} ${-a} A ${R} ${R} 0 0 0 ${x1 + sag} ${a} L ${x2 - sag} ${a} A ${R} ${R} 0 0 0 ${x2 - sag} ${-a} Z`;
  const vb = `${xMin} -30 ${sensorX + 16 - xMin} 60`;

  return (
    <svg viewBox={vb} className="lentes-bancada" role="img" aria-label={lang === 'pt' ? `Corte da objetiva de ${f} mm em f/${N} focada a ${m(s, lang)}` : `Cross-section of the ${f} mm lens at f/${N} focused at ${m(s, lang)}`}>
      <defs>
        <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="vidro" x1="0" x2="1">
          <stop offset="0" stopColor="#bcd3ff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#7aa2ff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#bcd3ff" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <line x1={xMin} x2={sensorX + 16} y1={0} y2={0} stroke="currentColor" strokeOpacity={0.25} strokeWidth={0.3} strokeDasharray="2 2" />
      <g filter={brilho ? 'url(#brilho)' : undefined}>
      {raios.map((r, i) => (
        <polyline key={i} points={r.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={r.cor} strokeWidth={0.35} strokeOpacity={0.9} />
      ))}
      </g>
      <path d={lente} fill={brilho ? 'url(#vidro)' : '#7aa2ff'} fillOpacity={brilho ? 1 : 0.28} stroke="#bcd3ff" strokeWidth={0.4} />
      {/* diaphragm blades */}
      <rect x={centro - 0.6} y={-30} width={1.2} height={30 - raioAbertura} fill="currentColor" fillOpacity={0.75} />
      <rect x={centro - 0.6} y={raioAbertura} width={1.2} height={30 - raioAbertura} fill="currentColor" fillOpacity={0.75} />
      {/* sensor */}
      <rect x={sensorX} y={-12} width={1.6} height={24} fill="#ffc21a" />
      <text x={sensorX + 2.5} y={-13.5} fontSize={3} fill="currentColor" fillOpacity={0.7}>sensor</text>
      <text x={xMin + 3} y={27} fontSize={3} fill="currentColor" fillOpacity={0.7}>{f} mm · f/{N}</text>
    </svg>
  );
}

/** Simple illustrated objects for the viewfinder, each blurred by its own circle of confusion. */
function Visor({ borrao, lang }: { borrao: number[]; lang: Lang }) {
  // Sensor 36 mm wide shown in ~480 px: blur in px proportional to blur on the sensor.
  const px = (mm: number) => Math.min(22, (mm / 36) * 480 * 0.5);
  return (
    <svg viewBox="0 0 480 300" className="lentes-visor" role="img" aria-label={lang === 'pt' ? 'Visor da câmera' : 'Camera viewfinder'}>
      <defs>
        {borrao.map((b, i) => (
          <filter key={i} id={`bl${i}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={px(b) / 2} />
          </filter>
        ))}
      </defs>
      <rect width={480} height={300} fill="#1a2238" />
      {/* window (far) */}
      <g filter="url(#bl2)">
        <rect x={250} y={30} width={190} height={150} fill="#9fc3ff" />
        <rect x={250} y={30} width={190} height={150} fill="none" stroke="#e8ecf6" strokeWidth={8} />
        <line x1={345} y1={30} x2={345} y2={180} stroke="#e8ecf6" strokeWidth={6} />
        <line x1={250} y1={105} x2={440} y2={105} stroke="#e8ecf6" strokeWidth={6} />
        <circle cx={300} cy={70} r={14} fill="#ffe08a" />
      </g>
      {/* plant (middle) */}
      <g filter="url(#bl1)">
        <rect x={60} y={170} width={70} height={60} rx={6} fill="#b5764a" />
        {[-30, -10, 10, 30].map((a, i) => (
          <ellipse key={i} cx={95 + a} cy={140 - Math.abs(a) * 0.4} rx={16} ry={38} fill="#2e9b62" transform={`rotate(${a} ${95 + a} ${170})`} />
        ))}
      </g>
      {/* table + cup (near) */}
      <rect x={0} y={250} width={480} height={50} fill="#3a2a22" filter="url(#bl0)" />
      <g filter="url(#bl0)">
        <rect x={190} y={190} width={90} height={80} rx={10} fill="#ef5b5b" />
        <path d="M280 205 q30 0 30 25 t-30 25" fill="none" stroke="#ef5b5b" strokeWidth={10} />
        <ellipse cx={235} cy={192} rx={45} ry={8} fill="#c94545" />
      </g>
    </svg>
  );
}

export default function Lentes({ lang }: { lang: Lang }) {
  const brilho = useModo() === 'visual';
  // Server HTML always has the SVG viewfinder; the 3D one mounts on the client only.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const [f, setF] = useState(50);
  const [iN, setIN] = useState(1);
  const [anel, setAnel] = useState(distParaAnel(2000));
  const [feitas, setFeitas] = useState<number[]>([]);
  const N = ABERTURAS[iN];
  const s = anelParaDist(anel);
  const dof = useMemo(() => profundidade(f, N, s), [f, N, s]);
  const borrao = OBJETOS.map((o) => desfoque(f, N, s, o.d));
  const atual = tarefas.find((t) => !feitas.includes(t.id));
  const cumpriu = Boolean(atual && atual.ok(borrao));
  useEffect(() => {
    if (cumpriu && atual) setFeitas((x) => (x.includes(atual.id) ? x : [...x, atual.id]));
  }, [cumpriu, atual]);

  // Depth strip: 0.3 m .. 20 m on a log scale.
  const escala = (d: number) => (d === Infinity ? 100 : Math.min(100, (Math.log(d / 300) / Math.log(20000 / 300)) * 100));

  return (
    <div className="lentes">
      <div className="lentes-vistas">
        <figure className="lentes-cartao">
          <figcaption className="lab-rotulo">{lang === 'pt' ? 'Corte da objetiva (traçado de raios, lei de Snell)' : 'Lens cross-section (ray tracing, Snell’s law)'}</figcaption>
          <Bancada f={f} N={N} s={s} lang={lang} brilho={brilho} />
        </figure>
        <figure className="lentes-cartao">
          <figcaption className="lab-rotulo">{lang === 'pt' ? 'Pelo visor' : 'Through the viewfinder'}{brilho && montado && (lang === 'pt' ? ' · 3D, desfoque por pixel' : ' · 3D, per-pixel blur')}</figcaption>
          {brilho && montado ? (
            <Suspense fallback={<Visor borrao={borrao} lang={lang} />}>
              <Visor3D f={f} N={N} s={s} lang={lang} />
            </Suspense>
          ) : (
            <Visor borrao={borrao} lang={lang} />
          )}
        </figure>
      </div>

      <div className="lentes-faixa" aria-hidden="true">
        <div className="lentes-nitida" style={{ left: `${escala(dof.perto)}%`, width: `${Math.max(0.8, escala(dof.longe) - escala(dof.perto))}%` }} />
        {OBJETOS.map((o) => (
          <span key={o.id} className="lentes-marca" style={{ left: `${escala(o.d)}%`, background: o.cor }} title={o.nome[lang]} />
        ))}
        <span className="lentes-foco" style={{ left: `${escala(s)}%` }} />
      </div>

      <div className="lentes-controles">
        <label className="lab-campo">
          <span className="lab-rotulo">{lang === 'pt' ? 'Anel de foco' : 'Focus ring'} · <b>{m(s, lang)}</b></span>
          <input type="range" min={0} max={1000} value={anel} onChange={(e) => setAnel(Number(e.target.value))} aria-valuetext={m(s, lang)} />
        </label>
        <label className="lab-campo">
          <span className="lab-rotulo">{lang === 'pt' ? 'Abertura' : 'Aperture'} · <b>f/{N}</b></span>
          <input type="range" min={0} max={ABERTURAS.length - 1} step={1} value={iN} onChange={(e) => setIN(Number(e.target.value))} aria-valuetext={`f/${N}`} />
        </label>
        <fieldset className="lab-campo">
          <legend className="lab-rotulo">{lang === 'pt' ? 'Distância focal' : 'Focal length'}</legend>
          <div className="lab-linha">
            {FOCAIS.map((x) => (
              <button key={x} type="button" className={`lab-botao ${x === f ? 'lab-botao-forte' : ''}`} aria-pressed={x === f} onClick={() => setF(x)}>{x} mm</button>
            ))}
          </div>
        </fieldset>
      </div>

      <dl className="lentes-numeros">
        <div><dt>{lang === 'pt' ? 'Nítido de' : 'Sharp from'}</dt><dd>{m(dof.perto, lang)}</dd></div>
        <div><dt>{lang === 'pt' ? 'até' : 'to'}</dt><dd>{m(dof.longe, lang)}</dd></div>
        <div><dt>{lang === 'pt' ? 'Hiperfocal' : 'Hyperfocal'}</dt><dd>{m(dof.hiperfocal, lang)}</dd></div>
        {OBJETOS.map((o, i) => (
          <div key={o.id}><dt><span aria-hidden="true" className="lentes-cor" style={{ background: o.cor }} />{o.nome[lang]} ({m(o.d, lang)})</dt><dd>{borrao[i] <= COC_FF ? (lang === 'pt' ? 'nítida' : 'sharp') : `${borrao[i].toLocaleString(lang === 'pt' ? 'pt-BR' : 'en', { maximumFractionDigits: 2 })} mm`}</dd></div>
        ))}
      </dl>

      <section className="lentes-roteiro" aria-live="polite">
        <p className="lab-rotulo">{lang === 'pt' ? `Roteiro · ${feitas.length}/${tarefas.length}` : `Guide · ${feitas.length}/${tarefas.length}`}</p>
        {atual ? (
          <>
            <p className="lentes-tarefa">{atual.texto[lang]}</p>
            <details><summary>{lang === 'pt' ? 'Dica' : 'Hint'}</summary><p>{atual.dica[lang]}</p></details>
          </>
        ) : (
          <p className="lentes-tarefa">{lang === 'pt' ? 'Roteiro completo. Agora você controla a profundidade de campo.' : 'Guide complete. You now control depth of field.'}</p>
        )}
        <p className="lab-dica">
          {lang === 'pt'
            ? `Modelo de lente fina, círculo de confusão de ${COC_FF} mm (sensor 36 × 24 mm). Os raios atravessam uma lente biconvexa de vidro BK7 (n = 1,5168).`
            : `Thin-lens model, ${COC_FF} mm circle of confusion (36 × 24 mm sensor). Rays cross a BK7 glass biconvex lens (n = 1.5168).`}
        </p>
      </section>
    </div>
  );
}
