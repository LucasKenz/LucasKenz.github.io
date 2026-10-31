// Mini-animações dos cards: cada subsistema mostra, em 2D, o que ele faz.
import { reduzMovimento, clamp } from '../util.js';

const ACC = '#ffc21a', AZUL = '#5d86ff', TINTA = '#eef1fa', MUDO = '#a8b2cc', LINHA = '#263256', OK = '#3fd18b', QUENTE = '#ff9b3d';
const TAU = Math.PI * 2;

function rot(g, txt, x, y, cor = MUDO, al = 'left', tam = 13) {
  g.font = `${tam}px "IBM Plex Mono", monospace`;
  g.fillStyle = cor; g.textAlign = al; g.textBaseline = 'middle';
  g.fillText(txt, x, y);
}
function seta(g, x0, y0, x1, y1, cor = TINTA, lw = 2) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.strokeStyle = cor; g.fillStyle = cor; g.lineWidth = lw;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 9 * Math.cos(a - 0.4), y1 - 9 * Math.sin(a - 0.4)); g.lineTo(x1 - 9 * Math.cos(a + 0.4), y1 - 9 * Math.sin(a + 0.4)); g.closePath(); g.fill();
}
const ponto = (g, x, y, r, cor) => { g.fillStyle = cor; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };

const CENAS = {
  luz(g, w, h, t) {
    const F = 18.03, yM2 = 20.3, X = (x) => w / 2 + x * 17, Y = (y) => h - 40 - (y + 7) * 10.2;
    // M1
    g.strokeStyle = '#dfe6f0'; g.lineWidth = 5;
    for (const [a, b] of [[-12.9, -4.6], [-4.2, -0.6], [0.6, 4.2], [4.6, 12.9]]) {
      g.beginPath();
      for (let x = a; x <= b; x += 0.2) { const y = (x * x) / (4 * F); x === a ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y)); }
      g.stroke();
    }
    // M2 (côncavo, Gregoriano)
    g.lineWidth = 4; g.beginPath();
    for (let x = -1.7; x <= 1.7; x += 0.1) { const y = yM2 - (x * x) / 6; x === -1.7 ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y)); }
    g.stroke();
    rot(g, 'M1 (25,4 m)', X(7), Y(-1.5), MUDO, 'left');
    rot(g, 'M2', X(2.2), Y(yM2), MUDO);
    rot(g, 'foco primário', X(0.6), Y(F), MUDO, 'left', 11);
    rot(g, 'foco Gregoriano', X(0.8), Y(-6), ACC, 'left', 12);
    ponto(g, X(0), Y(F), 3, MUDO);
    ponto(g, X(0), Y(-6), 4, ACC);
    // raios
    for (const x0 of [-11.5, -8, -5.5, 5.5, 8, 11.5]) {
      const y1 = (x0 * x0) / (4 * F);
      const k = (yM2 - y1) / (F - y1), xm2 = x0 + (0 - x0) * k;
      const P = [[x0, 23.5], [x0, y1], [xm2, yM2 - (xm2 * xm2) / 6], [0, -6]];
      g.strokeStyle = 'rgba(255,194,26,.35)'; g.lineWidth = 1;
      g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke();
      // fóton andando pelo caminho
      const L = [];
      let tot = 0;
      for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); tot += d; }
      let s = ((t * 14 + x0 * 3) % tot + tot) % tot;
      for (let i = 0; i < L.length; i++) {
        if (s <= L[i]) { const f = s / L[i]; ponto(g, X(P[i][0] + (P[i + 1][0] - P[i][0]) * f), Y(P[i][1] + (P[i + 1][1] - P[i][1]) * f), 3.5, ACC); break; }
        s -= L[i];
      }
    }
  },
  atuadores(g, w, h, t) {
    const inc = Math.sin(t * 0.6) * 0.5 + 0.5; // 0 zênite, 1 baixo
    rot(g, `elevação ${Math.round(90 - inc * 65)}°`, 20, 22, ACC);
    const x0 = 70, x1 = w - 70, y = 150, n = 15;
    const sag = (x) => Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 26 * inc;
    const corr = 0.92 + 0.08 * Math.sin(t * 2);
    // vidro (favo de mel)
    g.strokeStyle = '#9fd2e2'; g.lineWidth = 2;
    g.beginPath(); for (let x = x0; x <= x1; x += 4) { const yy = y + sag(x) * (1 - corr); x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke();
    g.beginPath(); for (let x = x0; x <= x1; x += 4) { const yy = y + 60 + sag(x) * (1 - corr); x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke();
    g.strokeStyle = 'rgba(159,210,226,.35)';
    for (let x = x0; x <= x1; x += 22) { g.beginPath(); g.moveTo(x, y + sag(x) * (1 - corr)); g.lineTo(x + 11, y + 60 + sag(x) * (1 - corr)); g.stroke(); }
    // atuadores
    for (let i = 0; i < n; i++) {
      const x = x0 + 20 + (i * (x1 - x0 - 40)) / (n - 1);
      const f = sag(x) * corr;
      const topo = y + 64 + sag(x) * (1 - corr);
      g.fillStyle = '#5b6270'; g.fillRect(x - 7, 300, 14, 30);
      g.fillStyle = '#c9ced6'; g.fillRect(x - 4, topo, 8, 300 - topo);
      seta(g, x, 300 + 24 - f * 0.4, x, 300 + 4 - f * 0.4, ACC, 1.5);
    }
    rot(g, '160 atuadores pneumáticos empurram o fundo do favo de mel', w / 2, 355, MUDO, 'center', 12);
    rot(g, `forma corrigida: ${Math.round(corr * 100)}%`, w - 20, 22, OK, 'right');
  },
  capas(g, w, h, t) {
    const k = (Math.sin(t * 0.8) + 1) / 2, cx = w / 2, cy = h / 2 + 5, R = 120;
    g.fillStyle = '#cfd8e6'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.fillStyle = 'rgba(93,134,255,.25)'; g.beginPath(); g.arc(cx - 30, cy - 30, R * 0.5, 0, TAU); g.fill();
    for (let j = 0; j < 6; j++) {
      const a = (j * TAU) / 6 + Math.PI / 6, L = (R + 8) * (1 - k);
      const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
      const bx = cx + ca * (R + 10), by = cy + sa * (R + 10);
      g.fillStyle = '#9aa3b2'; g.strokeStyle = '#3e4651'; g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(bx + px * 66, by + py * 66); g.lineTo(bx - px * 66, by - py * 66);
      g.lineTo(bx - ca * L - px * 10, by - sa * L - py * 10); g.lineTo(bx - ca * L + px * 10, by - sa * L + py * 10);
      g.closePath(); g.fill(); g.stroke();
    }
    rot(g, k > 0.5 ? 'capas abertas: espelho exposto ao céu' : 'capas fechadas: aluminização protegida', w / 2, h - 22, k > 0.5 ? OK : ACC, 'center');
  },
  asm(g, w, h, t) {
    const yIn = 70, ySh = 190, yOut = 300;
    const onda = (x, a) => Math.sin(x / 38 + t * 2.2) * 14 * a + Math.sin(x / 17 - t * 1.3) * 6 * a;
    rot(g, 'frente de onda distorcida pela atmosfera', 20, 30, QUENTE);
    g.strokeStyle = QUENTE; g.lineWidth = 2;
    for (const dy of [0, 26]) { g.beginPath(); for (let x = 60; x <= w - 60; x += 4) { const y = yIn + dy + onda(x, 1); x === 60 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    seta(g, w / 2, yIn + 45, w / 2, ySh - 30, MUDO);
    // casca deformável + atuadores
    g.strokeStyle = '#e8edf3'; g.lineWidth = 4;
    g.beginPath(); for (let x = 60; x <= w - 60; x += 4) { const y = ySh - onda(x, 0.5); x === 60 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    for (let x = 70; x <= w - 70; x += 20) { g.strokeStyle = '#b87333'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, ySh - onda(x, 0.5) - 6); g.lineTo(x, ySh - 40); g.stroke(); }
    rot(g, 'casca de 2 mm, 675 bobinas, 2.000×/s', w / 2, ySh - 52, ACC, 'center');
    seta(g, w / 2, ySh + 20, w / 2, yOut - 20, MUDO);
    g.strokeStyle = OK; g.lineWidth = 2;
    for (const dy of [0, 26]) { g.beginPath(); g.moveTo(60, yOut + dy); g.lineTo(w - 60, yOut + dy); g.stroke(); }
    rot(g, 'frente de onda corrigida (plana)', 20, h - 20, OK);
  },
  vibracao(g, w, h, t) {
    const raj = Math.max(0, Math.sin(t * 0.9)) ** 3;
    const x = Math.sin(t * 2 * Math.PI * 1.2) * 14 * Math.exp(-((t * 0.9) % TAU) * 0.15) * (0.3 + raj);
    const bx = 170, by = h - 40, tx = 170 + x, ty = 70;
    g.strokeStyle = '#e4e6ea'; g.lineWidth = 4;
    for (const d of [-90, -30, 30, 90]) { g.beginPath(); g.moveTo(bx + d, by); g.lineTo(tx + d * 0.12, ty); g.stroke(); }
    g.lineWidth = 2; g.strokeStyle = 'rgba(228,230,234,.5)';
    for (let i = 1; i < 5; i++) { const f = i / 5; g.beginPath(); g.moveTo(bx - 90 + (tx - bx + 79) * f, by + (ty - by) * f); g.lineTo(bx + 90 + (tx - bx - 79) * f, by + (ty - by) * f); g.stroke(); }
    g.fillStyle = '#c9ced6'; g.fillRect(tx - 32, ty - 18, 64, 18);
    rot(g, 'M2', tx, ty - 30, MUDO, 'center');
    for (let i = 0; i < 4; i++) seta(g, 20 + ((t * 120 + i * 40) % 60), 90 + i * 40, 60 + ((t * 120 + i * 40) % 60), 90 + i * 40, `rgba(93,134,255,${0.3 + raj * 0.7})`);
    rot(g, 'rajada', 20, 64, AZUL);
    // estrela no detector
    const cx = w - 140, cy = h / 2;
    g.strokeStyle = LINHA; g.strokeRect(cx - 90, cy - 90, 180, 180);
    const gr = g.createRadialGradient(cx + x * 2.2, cy, 0, cx + x * 2.2, cy, 18);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, ACC); gr.addColorStop(1, 'rgba(255,194,26,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx + x * 2.2, cy, 18, 0, TAU); g.fill();
    rot(g, 'imagem da estrela', cx, cy + 108, MUDO, 'center');
    rot(g, '1 µm no M2 ≈ 0,02″ na imagem (estimado)', w / 2, 22, ACC, 'center', 12);
  },
  elevacao(g, w, h, t) {
    const el = (Math.sin(t * 0.5) * 0.5 + 0.5) * 65 + 25, a = (90 - el) * Math.PI / 180;
    const cx = w / 2 - 40, cy = 170, R = 110;
    // berço
    g.fillStyle = '#2c5cc5'; g.fillRect(cx - 70, cy + R + 4, 140, 40);
    g.fillStyle = '#c9ced6'; g.fillRect(cx - 55, cy + R - 2, 30, 8); g.fillRect(cx + 25, cy + R - 2, 30, 8);
    // C-ring
    g.strokeStyle = '#5d86ff'; g.lineWidth = 12;
    g.beginPath(); g.arc(cx, cy, R, Math.PI / 2 - 1.8 + a, Math.PI / 2 + 1.8 + a); g.stroke();
    // tubo óptico
    g.save(); g.translate(cx, cy); g.rotate(a);
    g.strokeStyle = '#e4e6ea'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-80, 10); g.lineTo(80, 10); g.stroke();
    g.beginPath(); g.moveTo(-70, 10); g.lineTo(-12, -150); g.moveTo(70, 10); g.lineTo(12, -150); g.stroke();
    g.fillStyle = '#c9ced6'; g.fillRect(-20, -158, 40, 8);
    g.restore();
    ponto(g, cx, cy, 5, ACC);
    rot(g, 'eixo de elevação', cx + 10, cy - 8, ACC, 'left', 11);
    rot(g, `${Math.round(el)}°`, w - 40, 40, ACC, 'right', 26);
    rot(g, 'o C-ring rola sobre as sapatas hidrostáticas', w / 2, h - 18, MUDO, 'center', 12);
  },
  oleo(g, w, h, t) {
    const lig = Math.sin(t * 0.7) > -0.3 ? 1 : 0;
    const fil = lig ? 26 + Math.sin(t * 3) * 1.5 : 2;
    const yR = 250;
    g.fillStyle = '#e0702a'; g.fillRect(60, yR, w - 120, 60);
    g.fillStyle = '#c9ced6'; g.fillRect(60, yR - 6, w - 120, 6);
    rot(g, 'pista do trilho (planicidade de 20 µm local)', w / 2, yR + 34, '#0b0d12', 'center', 12);
    const y0 = yR - 6 - fil;
    g.fillStyle = 'rgba(255,194,26,.55)'; g.fillRect(170, y0, w - 340, fil);
    g.fillStyle = '#2c5cc5'; g.fillRect(150, y0 - 90, w - 300, 90);
    g.fillStyle = '#c9ced6'; g.fillRect(160, y0 - 10, w - 320, 10);
    rot(g, 'sapata do mancal', w / 2, y0 - 50, TINTA, 'center');
    if (lig) for (let i = 0; i < 6; i++) {
      const k = ((t * 0.8 + i / 6) % 1);
      ponto(g, w / 2 + (k - 0.5) * (w - 360) * (i % 2 ? 1 : -1) * -1, y0 + fil / 2, 3, '#ffd770');
    }
    rot(g, lig ? `filme de óleo ≈ 50 µm (×10⁴ no desenho)` : 'bomba desligada: sapata apoiada', w / 2, 40, lig ? ACC : QUENTE, 'center');
    seta(g, w / 2, 70, w / 2, y0 - 100, MUDO);
    rot(g, '2.100 t', w / 2 + 12, 90, MUDO);
  },
  gir(g, w, h, t) {
    const ang = t * 0.35;
    const painel = (cx, comGir, titulo) => {
      g.save(); g.translate(cx, h / 2 + 10);
      g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.clip();
      g.fillStyle = '#03060e'; g.fillRect(-130, -130, 260, 260);
      g.save(); g.rotate(comGir ? 0 : ang);
      const est = [[-50, -30, 4], [30, -60, 3], [60, 20, 5], [-20, 50, 3], [0, 0, 6], [-70, 40, 2], [80, -20, 2]];
      for (const [x, y, r] of est) ponto(g, x, y, r, '#fff');
      g.restore();
      g.strokeStyle = comGir ? OK : QUENTE; g.lineWidth = 2;
      g.strokeRect(-70, -50, 140, 100);
      g.restore();
      g.strokeStyle = LINHA; g.beginPath(); g.arc(cx, h / 2 + 10, 120, 0, TAU); g.stroke();
      rot(g, titulo, cx, 28, comGir ? OK : QUENTE, 'center', 12);
    };
    painel(w * 0.27, false, 'sem rotador: o campo gira no detector');
    painel(w * 0.73, true, 'com GIR: o detector acompanha');
  },
  lgs(g, w, h, t) {
    const yNa = 60, base = h - 30;
    g.fillStyle = 'rgba(255,194,26,.12)'; g.fillRect(0, yNa - 14, w, 28);
    rot(g, 'camada de sódio ~90 km', 12, yNa - 24, ACC, 'left', 12);
    for (let k = 0; k < 3; k++) {
      const yy = 150 + k * 50;
      g.strokeStyle = 'rgba(93,134,255,.35)'; g.lineWidth = 1.5;
      g.beginPath(); for (let x = 0; x <= w; x += 6) { const y = yy + Math.sin(x / 30 + t * (1 + k * 0.5) + k) * 6; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    rot(g, 'turbulência', w - 12, 160, AZUL, 'right', 12);
    g.fillStyle = '#e4e6ea'; g.fillRect(w / 2 - 60, base - 18, 120, 18);
    const pulso = (t * 0.6) % 1;
    for (const dx of [-40, 40]) {
      g.strokeStyle = 'rgba(255,176,32,.85)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(w / 2 + dx, base - 18); g.lineTo(w / 2 + dx * 0.2, yNa); g.stroke();
      const gr = g.createRadialGradient(w / 2 + dx * 0.2, yNa, 0, w / 2 + dx * 0.2, yNa, 20);
      gr.addColorStop(0, '#fff6c8'); gr.addColorStop(1, 'rgba(255,194,26,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(w / 2 + dx * 0.2, yNa, 20, 0, TAU); g.fill();
      const y = yNa + (base - 18 - yNa) * pulso;
      ponto(g, w / 2 + dx * 0.2 + (dx * 0.8) * pulso * 0.1, y, 3, '#fff6c8');
    }
    rot(g, 'o brilho de volta mede a turbulência', w / 2, base + 14, MUDO, 'center', 12);
  },
  sismo(g, w, h, t) {
    const chao = Math.sin(t * 7) * 22 * (0.5 + 0.5 * Math.sin(t * 0.7));
    const pier = Math.sin(t * 7 - 1.2) * 2.5 * (0.5 + 0.5 * Math.sin(t * 0.7 - 0.3));
    const y0 = h - 60;
    g.fillStyle = '#5b4a3a'; g.fillRect(0 + chao, y0, w, 60);
    rot(g, 'chão', 20 + chao, y0 + 30, TINTA);
    for (let i = 0; i < 5; i++) {
      const x = w / 2 - 120 + i * 60;
      g.fillStyle = '#3e4651'; g.fillRect(x - 18 + chao, y0 - 10, 36, 10);
      g.fillStyle = '#c9ced6'; g.beginPath(); g.ellipse(x + (chao + pier) / 2, y0 - 14, 14, 5, 0, 0, TAU); g.fill();
    }
    g.fillStyle = '#c3c0ba'; g.fillRect(w / 2 - 140 + pier, y0 - 200, 280, 182);
    g.fillStyle = '#2c5cc5'; g.fillRect(w / 2 - 80 + pier, y0 - 236, 160, 36);
    rot(g, 'pier', w / 2 + pier, y0 - 110, '#0b0d12', 'center');
    rot(g, 'telescópio', w / 2 + pier, y0 - 218, TINTA, 'center', 12);
    rot(g, 'até 700 mm de folga nos pêndulos de atrito', w / 2, 24, ACC, 'center', 12);
  },
  domo(g, w, h, t) {
    const az = t * 0.4, cx = w / 2, cy = h / 2 + 8, R = 130;
    g.strokeStyle = LINHA; g.lineWidth = 1;
    for (let i = 0; i < 33; i++) { const a = (i / 33) * TAU; ponto(g, cx + Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10), 3, '#5d86ff'); }
    g.fillStyle = '#e8e6e0';
    g.beginPath(); g.arc(cx, cy, R, az + 0.45, az - 0.45 + TAU); g.lineTo(cx, cy); g.closePath(); g.fill();
    g.fillStyle = '#2b3350'; g.beginPath(); g.arc(cx, cy, R, az - 0.45, az + 0.45); g.lineTo(cx, cy); g.fill();
    seta(g, cx, cy, cx + Math.cos(az) * (R + 70), cy + Math.sin(az) * (R + 70), ACC, 3);
    ponto(g, cx + Math.cos(az) * (R + 80), cy + Math.sin(az) * (R + 80), 5, '#fff');
    rot(g, '33 pares de bogies · 1 volta em 4 min', 16, 22, MUDO, 'left', 12);
  },
  portas(g, w, h, t) {
    const k = (Math.sin(t * 0.7) + 1) / 2, cx = w / 2, base = h - 30, topo = 50, larg = 150;
    g.fillStyle = '#e8e6e0'; g.fillRect(cx - 260, topo, 520, base - topo);
    g.fillStyle = '#081024'; g.fillRect(cx - larg / 2, topo, larg, base - 70 - topo);
    for (let i = 0; i < 30; i++) ponto(g, cx - larg / 2 + ((i * 53) % larg), topo + ((i * 97) % (base - 80 - topo)), 1.2, '#fff');
    g.fillStyle = '#d7d4cc'; g.strokeStyle = '#8b95a3';
    const off = k * (larg / 2 + 30);
    g.fillRect(cx - larg / 2 - off, topo - 6, larg / 2 + 4, base - 64 - topo); g.strokeRect(cx - larg / 2 - off, topo - 6, larg / 2 + 4, base - 64 - topo);
    g.fillRect(cx - 4 + off, topo - 6, larg / 2 + 4, base - 64 - topo); g.strokeRect(cx - 4 + off, topo - 6, larg / 2 + 4, base - 64 - topo);
    rot(g, k > 0.5 ? 'fenda aberta: 27 m de largura' : 'portas fechadas', cx, 26, k > 0.5 ? OK : ACC, 'center');
    rot(g, '667 t nas duas portas', cx, base - 20, '#0b0d12', 'center', 12);
  },
  ventilacao(g, w, h, t) {
    const ab = (Math.sin(t * 0.5) + 1) / 2 > 0.4;
    const x0 = 90, x1 = w - 90, y0 = 60, y1 = h - 50;
    g.strokeStyle = '#e8e6e0'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1, y1); g.stroke();
    for (const x of [x0, x1]) for (let i = 0; i < 4; i++) {
      const yy = y0 + 40 + i * 55;
      g.fillStyle = ab ? '#081024' : '#c9ced6';
      g.fillRect(x - 4, yy, 8, 34);
    }
    for (let i = 0; i < 14; i++) {
      const fase = (t * (ab ? 0.25 : 0.05) + i / 14) % 1;
      const x = ab ? x0 - 60 + fase * (x1 - x0 + 120) : x0 + 40 + ((i * 37) % (x1 - x0 - 80)) + Math.sin(t + i) * 8;
      const y = y0 + 40 + ((i * 71) % (y1 - y0 - 80)) + Math.sin(t * 2 + i) * 6;
      const quente = ab ? clamp(1 - (x - x0) / (x1 - x0), 0, 1) : 1;
      g.fillStyle = `rgba(255,${Math.round(155 + 60 * (1 - quente))},61,${0.25 + 0.5 * quente})`;
      g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill();
    }
    if (ab) for (let i = 0; i < 4; i++) seta(g, 10, y0 + 57 + i * 55, x0 - 14, y0 + 57 + i * 55, AZUL);
    rot(g, ab ? 'respiros abertos: o vento lava o ar quente' : 'respiros fechados: o ar quente fica e borra a imagem', w / 2, 26, ab ? OK : QUENTE, 'center', 12);
  },
  cume(g, w, h, t) {
    const k = (t * 0.12) % 1;
    g.fillStyle = '#8d8274'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e6e0'; g.beginPath(); g.arc(170, h / 2, 70, 0, TAU); g.fill();
    rot(g, 'enclosure', 170, h / 2, '#0b0d12', 'center');
    g.fillStyle = '#e4e6ea'; g.fillRect(w - 250, h / 2 - 50, 200, 100);
    rot(g, 'prédio de apoio', w - 150, h / 2 - 20, '#0b0d12', 'center');
    rot(g, 'câmara de aluminização', w - 150, h / 2 + 10, '#0b0d12', 'center', 11);
    const fase = k < 0.4 ? k / 0.4 : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    const x = 200 + fase * (w - 420);
    g.fillStyle = k >= 0.4 && k < 0.6 ? '#fff' : '#cfd8e6';
    g.beginPath(); g.ellipse(x, h / 2 + 90, 34, 10, 0, 0, TAU); g.fill();
    if (k >= 0.4 && k < 0.6) { const gr = g.createRadialGradient(x, h / 2 + 90, 0, x, h / 2 + 90, 60); gr.addColorStop(0, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, h / 2 + 90, 60, 0, TAU); g.fill(); }
    rot(g, 'espelho de 17 t na ponte rolante de 75 t', w / 2, 26, TINTA, 'center', 12);
  },
};

export function criarPrevia(canvas) {
  const g = canvas.getContext('2d');
  let tipo = null, raf = 0;
  const t0 = performance.now();
  function quadro(agora) {
    const t = reduzMovimento ? 2.2 : (agora - t0) / 1000;
    const w = canvas.width, h = canvas.height;
    g.fillStyle = '#03060e'; g.fillRect(0, 0, w, h);
    try { CENAS[tipo]?.(g, w, h, t); } catch (e) { console.error(e); }
    if (!reduzMovimento && tipo) raf = requestAnimationFrame(quadro);
  }
  return {
    mostrar(t) { cancelAnimationFrame(raf); tipo = t; raf = requestAnimationFrame(quadro); },
    parar() { cancelAnimationFrame(raf); tipo = null; },
  };
}
export const TIPOS_PREVIA = Object.keys(CENAS);
