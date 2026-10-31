// Cargas de vento, jitter do M2, seeing, r0, τ0 e Strehl (modelo didático, premissas em data/gmt-data.json > modelo).
import { val } from '../data.js';

const R_AR = 287.05;

export const densidadeAr = (Tc) => val('local.pressao_Pa') / (R_AR * (Tc + 273.15));

/** Probabilidade de o vento noturno a 10 m ser menor que U (Weibull ajustada ao site). */
export function cdfVento(U) {
  const { k, c } = val('modelo.weibull');
  return 1 - Math.exp(-Math.pow(Math.max(U, 0) / c, k));
}
export function pdfVento(U) {
  const { k, c } = val('modelo.weibull');
  return (k / c) * Math.pow(U / c, k - 1) * Math.exp(-Math.pow(U / c, k));
}

/** Seeing (″ a 500 nm) somando camadas pela lei de 5/3. */
const soma53 = (...e) => Math.pow(e.reduce((s, x) => s + Math.pow(Math.max(x, 0), 5 / 3), 0), 3 / 5);

export function seeingComponentes({ U, dTm, dTd, vInt, aberto }) {
  const fa = val('seeing.atmosfera_livre_percentis_arcsec').p50;
  // camada do solo: correlação fraca com o vento; piora só com vento forte (site2010)
  const gl = val('seeing.camada_solo_percentis_arcsec').p50 * (1 + 0.6 * Math.max(0, (U - 12) / 8) ** 2);
  // seeing do domo e do espelho (Racine 1991), atenuados pela lavagem do ar
  const lav = 1 / (1 + vInt / 0.7);
  const domo = aberto ? val('modelo.racine_domo') * Math.pow(dTd, 1.2) * lav * 1.6 : val('modelo.racine_domo') * Math.pow(dTd, 1.2) * 2.5;
  const espelho = val('modelo.racine_espelho') * Math.pow(dTm, 1.2) / (1 + vInt / 1.0);
  return { fa, gl, domo, espelho, total: soma53(fa, gl, domo, espelho) };
}

export function r0De(seeingArcsec, lambda = 500e-9) {
  const rad = (seeingArcsec / 206265);
  const r0_500 = (0.98 * 500e-9) / rad;
  return r0_500 * Math.pow(lambda / 500e-9, 6 / 5);
}

/**
 * Simula 60 s: velocidades no M1 e no M2, forças, momento de elevação e jitter (oscilador de 1 grau de liberdade).
 * amostra(p, t, out) devolve a velocidade no ponto p (mundo).
 */
export function simular({ campo, posM1, posM2, eixo, T, dTm, dTd, lambda = 2.2e-6 }) {
  const c = campo.c;
  const rho = densidadeAr(T);
  const cdP = val('modelo.cd_placa'), cdD = val('modelo.cd_domo');
  const aTopo = val('modelo.area_topo_m2'), aPernas = val('modelo.area_pernas_m2');
  const aM1 = val('optica.area_coletora_m2');
  const fn = val('montagem.frequencia_natural_hz'), zeta = val('montagem.amortecimento_estrutural');
  const m = val('modelo.massa_modal_topo_t') * 1000;
  const sens = val('modelo.sensibilidade_m2_arcsec_um');
  // área do M1 vista pelo vento: de frente quando o eixo óptico encara o vento
  const face = Math.abs(eixo.x * c.ex + eixo.z * c.ez);
  const A1 = aM1 * (0.12 + 0.88 * face);

  const fs = 25, N = 60 * fs, dt = 1 / fs;
  const t = new Float32Array(N), v1 = new Float32Array(N), v2 = new Float32Array(N), F1 = new Float32Array(N), F2 = new Float32Array(N), Mel = new Float32Array(N);
  const o = [0, 0, 0];
  const pm = { x: (posM1.x + posM2.x) / 2, y: (posM1.y + posM2.y) / 2, z: (posM1.z + posM2.z) / 2 };
  for (let i = 0; i < N; i++) {
    const ti = i * dt;
    t[i] = ti;
    v1[i] = campo.amostrar(posM1.x, posM1.y, posM1.z, ti, o);
    v2[i] = campo.amostrar(posM2.x, posM2.y, posM2.z, ti, o);
    const vm = campo.amostrar(pm.x, pm.y, pm.z, ti, o);
    const q1 = 0.5 * rho * v1[i] * v1[i], q2 = 0.5 * rho * v2[i] * v2[i], qm = 0.5 * rho * vm * vm;
    F1[i] = q1 * cdP * A1;
    F2[i] = q2 * cdP * aTopo + qm * cdP * aPernas * 0.5;
    Mel[i] = (q2 * cdP * aTopo * 22 + qm * cdP * aPernas * 11) * face + F1[i] * 1.2 * 0.3;
  }
  // jitter: x'' + 2ζω x' + ω² x = F'(t)/m, só a parte flutuante (a média é absorvida pelo apontamento)
  let media = 0;
  for (let i = 0; i < N; i++) media += F2[i];
  media /= N;
  const w = 2 * Math.PI * fn, sub = 20, h = dt / sub;
  let x = 0, xv = 0;
  const jit = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const fa = F2[i] - media, fb = (i + 1 < N ? F2[i + 1] : F2[i]) - media;
    for (let s = 0; s < sub; s++) {
      const f = fa + ((fb - fa) * s) / sub;
      const acc = f / m - 2 * zeta * w * xv - w * w * x;
      xv += acc * h;
      x += xv * h;
    }
    jit[i] = x * 1e6 * sens; // ″
  }
  const rms = (a, ini = 5 * fs) => { let s = 0, mm = 0; for (let i = ini; i < a.length; i++) mm += a[i]; mm /= a.length - ini; for (let i = ini; i < a.length; i++) s += (a[i] - mm) ** 2; return Math.sqrt(s / (a.length - ini)); };
  const med = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const max = (a) => a.reduce((s, x) => Math.max(s, x), 0);

  const Udomo = campo.perfil(40);
  const Fdomo = 0.5 * rho * Udomo * Udomo * cdD * 61 * 65;
  const vInt = med(v1);
  const jitRms = rms(jit);
  const s = seeingComponentes({ U: c.U, dTm, dTd, vInt, aberto: c.aberto });
  const jitFwhm = 2.355 * jitRms;
  const totalSemAO = Math.hypot(s.total, jitFwhm);
  const r0 = r0De(s.total, 500e-9);
  const Valto = val('modelo.vento_alto_m_s');
  const Vef = Math.pow(0.65 * Math.pow(Math.max(c.U, 1), 5 / 3) + 0.35 * Math.pow(Valto, 5 / 3), 3 / 5);
  const tau0 = (0.314 * r0) / Vef;
  // Strehl com AO (Maréchal): erro de ajuste + atraso + resíduo de jitter (o ASM corrige ~90% do tip-tilt)
  const r0L = r0De(s.total, lambda), tau0L = (0.314 * r0L) / Vef;
  const pitch = val('modelo.pitch_atuadores_m'), atraso = val('modelo.atraso_ao_s');
  const sigFit = 0.28 * Math.pow(pitch / r0L, 5 / 3);
  const sigServo = Math.pow(atraso / tau0L, 5 / 3);
  const jitRes = (jitRms * 0.1) / 206265;
  const sigJit = Math.pow((2 * Math.PI * 25.4 * jitRes) / (4 * lambda), 2) * 2;
  const strehlAO = Math.exp(-(sigFit + sigServo + sigJit));
  const strehlSem = Math.min(1, Math.pow(r0L / 25.4, 2));

  return {
    rho, Udomo, Fdomo, A1, face,
    v1m: vInt, v2m: med(v2), v1max: max(v1), v2max: max(v2),
    F1m: med(F1), F2m: med(F2), F1max: max(F1), F2max: max(F2), Melm: med(Mel), Melmax: max(Mel),
    jitRms, jitFwhm, seeing: s, totalSemAO, r0, r0L, tau0, Vef, strehlAO, strehlSem, sigFit, sigServo,
    pVento: cdfVento(c.U), fechar: c.U > val('vento.limite_operacional_gmt_m_s'),
    serie: { t, v1, v2, F1, F2, jit },
  };
}

/** Curva aproximada de seeing total × vento para o gráfico (mantém as demais condições). */
export function curvaSeeing(base, Uatual, dTm, dTd, aberto, kInt) {
  const pts = [];
  for (let U = 0.5; U <= 25; U += 0.5) {
    const vInt = Math.max(0.05, kInt * U * 1.3);
    const s = seeingComponentes({ U, dTm, dTd, vInt, aberto });
    const jit = base.jitFwhm * Math.pow(U / Math.max(Uatual, 0.5), 2);
    pts.push([U, Math.hypot(s.total, jit), s.total]);
  }
  return pts;
}

