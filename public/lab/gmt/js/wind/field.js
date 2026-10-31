// Campo de vento didático em volta do enclosure (não é CFD):
//  perfil logarítmico + fluxo potencial em torno de um cilindro + esteira com vórtices de Strouhal
//  + turbulência sintética de Kraichnan (modos de Fourier com espectro de von Kármán, livres de divergência)
//  + fluxo interno controlado pela fenda, pelos respiros e pelo para-vento.
import { rng, gauss, smooth, clamp, DEG } from '../util.js';

export const R_DOMO = 30.6, H_DOMO = 64, Y_ANEL = 12.9, Y_FENDA = 19;

function criarModos(n = 32, sem = 11) {
  const r = rng(sem), L = 25, kmin = (2 * Math.PI) / 140, kmax = (2 * Math.PI) / 3;
  const modos = [];
  let soma = 0;
  for (let i = 0; i < n; i++) {
    const k = kmin * Math.pow(kmax / kmin, (i + r()) / n);
    const dk = k * Math.log(kmax / kmin) / n;
    // direção aleatória de k e direção da velocidade perpendicular a ela (campo sem divergência)
    let kx = gauss(r), ky = gauss(r) * 0.6, kz = gauss(r);
    const kl = Math.hypot(kx, ky, kz); kx /= kl; ky /= kl; kz /= kl;
    let ax = gauss(r), ay = gauss(r), az = gauss(r);
    const d = ax * kx + ay * ky + az * kz; ax -= d * kx; ay -= d * ky; az -= d * kz;
    const al = Math.hypot(ax, ay, az); ax /= al; ay /= al; az /= al;
    const E = Math.pow(k * L, 4) / Math.pow(1 + (k * L) ** 2, 17 / 6);
    const amp = Math.sqrt(E * dk);
    soma += amp * amp;
    modos.push({ kx: kx * k, ky: ky * k, kz: kz * k, ax, ay, az, amp, fase: r() * Math.PI * 2, w: 0.15 + r() * 0.3 });
  }
  // cada cos² vale 1/2 em média e cada componente leva ~1/3 da energia: Σamp² = 6 dá rms ≈ 1 por componente
  const norm = Math.sqrt(6 / soma);
  for (const m of modos) m.amp *= norm;
  return modos;
}

export function criarCampo() {
  const modos = criarModos();
  const c = {
    U: 6.3, dirDe: 45, turb: 0.12, aberto: true, vent: 0.5, tela: 0, rel: 180, z0: 0.05,
    ex: 0, ez: 1, kInt: 0.2, azDomo: 225, sx: 0, sz: 1, fShed: 0,
  };

  function config(o) {
    Object.assign(c, o);
    // vento VEM de dirDe (0 = N = −Z, 90 = L = +X); sopra no sentido oposto
    const a = c.dirDe * DEG;
    c.ex = -Math.sin(a); c.ez = Math.cos(a);
    c.azDomo = (c.dirDe + c.rel + 360) % 360;
    const b = c.azDomo * DEG;
    c.sx = Math.sin(b); c.sz = -Math.cos(b);
    const cosRel = Math.cos(c.rel * DEG);
    // fração do vento externo que entra no domo
    const fenda = c.aberto ? 0.08 + 0.5 * Math.max(0, cosRel) ** 1.5 : 0;
    c.kFenda = fenda;
    c.kInt = clamp(0.02 + 0.28 * c.vent * (c.aberto ? 1 : 0.6) + fenda, 0, 0.9);
    c.fShed = (0.2 * Math.max(c.U, 0.1)) / (2 * R_DOMO);
  }
  config({});

  /** Perfil logarítmico: velocidade média na altura y (m acima do platô), dada a medida a 10 m. */
  const perfil = (y) => c.U * Math.log(Math.max(y, 0.5) / c.z0) / Math.log(10 / c.z0);

  function turbulencia(x, y, z, t, out, escala) {
    let ux = 0, uy = 0, uz = 0;
    const Ut = c.U * t;
    const X = x - c.ex * Ut, Z = z - c.ez * Ut;
    for (let i = 0; i < modos.length; i++) {
      const m = modos[i];
      const s = m.amp * Math.cos(m.kx * X + m.ky * y + m.kz * Z + m.fase + m.w * t);
      ux += m.ax * s; uy += m.ay * s; uz += m.az * s;
    }
    out[0] += ux * escala; out[1] += uy * escala * 0.7; out[2] += uz * escala;
  }

  /** Velocidade (m/s) no ponto (x, y, z) no instante t. out = [vx, vy, vz]. Retorna |v|. */
  function amostrar(x, y, z, t, out = [0, 0, 0]) {
    out[0] = out[1] = out[2] = 0;
    if (y < 0.05) return 0;
    const r = Math.hypot(x, z);
    // sólido: enclosure inferior e anel
    if (r < R_DOMO && y < Y_ANEL + 2.4) return 0;
    const Uy = perfil(y);
    if (r < R_DOMO - 0.3 && y < H_DOMO) {
      // dentro do domo: o vento que entra pela fenda (barrado pelo para-vento) + o que passa pelos respiros
      const yTela = Y_FENDA + c.tela * 30;
      const barra = y < yTela ? 0.25 : 1;
      const k = clamp(c.kInt - c.kFenda * (1 - barra), 0.01, 0.9);
      const u = k * Uy;
      out[0] = c.ex * u; out[2] = c.ez * u;
      // recirculação: o ar sobe junto à parede de sotavento e desce no centro
      const xp = x * c.ex + z * c.ez;
      out[1] = 0.25 * u * (xp / R_DOMO) * Math.sin((Math.PI * (y - 15)) / 49);
      turbulencia(x, y, z, t, out, c.turb * Uy * 1.4 * Math.sqrt(k));
      return Math.hypot(out[0], out[1], out[2]);
    }
    // fora: coordenadas no referencial do vento (xp ao longo do fluxo, zp transversal)
    const xp = x * c.ex + z * c.ez, zp = -x * c.ez + z * c.ex;
    const acima = smooth(H_DOMO * 0.85, H_DOMO + 25, y); // 0 = na altura do domo, 1 = bem acima
    const R2 = R_DOMO * R_DOMO, r2 = Math.max(r * r, R2), r4 = r2 * r2;
    let u = Uy, v = 0, w = 0;
    // fluxo potencial em torno do cilindro (atenuado acima do teto)
    const fp = 1 - acima;
    u = Uy * (1 - fp * (R2 * (xp * xp - zp * zp)) / r4);
    v = -Uy * fp * (2 * R2 * xp * zp) / r4;
    // o ar sobe na frente do domo e acelera sobre o teto
    const g = Math.exp(-(((y - H_DOMO) / 14) ** 2));
    w = Uy * 0.45 * g * (-xp / Math.sqrt(r2)) * (R2 / r2);
    if (y > H_DOMO && r < R_DOMO * 1.2) u *= 1 + 0.25 * Math.exp(-((y - H_DOMO) / 10));
    // esteira a sotavento com desprendimento de vórtices (Strouhal 0,2)
    if (xp > 0) {
      const b = R_DOMO * (1 + (0.12 * xp) / R_DOMO);
      const env = Math.exp(-((zp / b) ** 2) * 2) * (1 - smooth(H_DOMO * 0.9, H_DOMO * 1.35, y));
      const decai = Math.exp(-xp / (5 * 2 * R_DOMO));
      const def = 0.75 * decai * env;
      u *= 1 - def;
      const fase = 2 * Math.PI * c.fShed * (t - xp / (0.8 * Math.max(c.U, 0.1)));
      v += Uy * 0.45 * decai * env * Math.sin(fase) * smooth(0, R_DOMO * 0.6, xp);
      w += Uy * 0.1 * decai * env * Math.cos(fase * 1.3);
    }
    out[0] = u * c.ex - v * c.ez;
    out[2] = u * c.ez + v * c.ex;
    out[1] = w;
    const naEsteira = xp > 0 ? Math.exp(-((zp / (R_DOMO * 1.3)) ** 2)) * Math.exp(-xp / 300) : 0;
    turbulencia(x, y, z, t, out, c.turb * Uy * (1 + 1.5 * naEsteira));
    return Math.hypot(out[0], out[1], out[2]);
  }

  /** Coeficiente de pressão (Cp) na parede e no teto do domo. ang: ângulo do ponto em torno do eixo (rad, x = cos, z = sin). */
  function cpDomo(xn, zn, noTeto) {
    const cosT = -(xn * c.ex + zn * c.ez); // 1 = ponto de estagnação (de frente para o vento)
    const th = Math.acos(clamp(cosT, -1, 1));
    if (noTeto) {
      // teto: sucção forte na borda de barlavento, aliviando para sotavento
      const s = (-(xn * c.ex + zn * c.ez) + 1) / 2;
      return -0.3 - 0.9 * s * s;
    }
    if (th < 1.25) return 1 - 4 * Math.sin(th) ** 2 * 0.62;
    // esteira separada: pressão de base quase constante
    return -1.15 + 0.25 * Math.cos(th * 3);
  }

  return { c, config, amostrar, perfil, cpDomo };
}
