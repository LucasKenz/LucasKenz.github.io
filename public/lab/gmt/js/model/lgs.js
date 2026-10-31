// Seis feixes de laser de 589 nm (LGS) saindo da borda do primário, paralelos ao eixo óptico.
import * as THREE from 'three';

export function criarLasers(posicoes, alcance = 3600) {
  const g = new THREE.Group();
  g.name = 'lasers';
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uOp: { value: 1 } },
    vertexShader: `varying float vY; varying vec2 vUv; void main(){ vY = uv.y; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uT; uniform float uOp; varying float vY; varying vec2 vUv;
      void main(){
        float borda = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float cint = 0.85 + 0.15 * sin(vY * 900.0 - uT * 6.0);
        float a = pow(borda, 1.5) * (0.25 + 0.75 * (1.0 - vY)) * cint * uOp;
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.12) * a * 1.6, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  const brilho = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), color: 0xffb020, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9, transparent: true });
  const geo = new THREE.CylinderGeometry(0.18, 0.18, alcance, 6, 1, true);
  geo.translate(0, alcance / 2, 0);
  for (const p of posicoes) {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(p);
    // converge levemente para o eixo: o asterismo de 1′ fica a ~90 km, aqui encurtado para caber na cena
    const alvo = new THREE.Vector3(p.x * 0.02, alcance, p.z * 0.02);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), alvo.sub(p).normalize());
    m.frustumCulled = false;
    m.renderOrder = 5;
    const s = new THREE.Sprite(brilho);
    s.position.copy(p);
    s.scale.setScalar(2.2);
    g.add(m, s);
  }
  return { grupo: g, atualizar: (t) => { mat.uniforms.uT.value = t; } };
}
