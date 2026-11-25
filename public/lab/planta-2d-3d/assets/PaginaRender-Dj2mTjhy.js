const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./src-2ff0ZTyZ.js","./three-DPeXgOaA.js"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{i as t,t as n}from"./react-Bcvv3v6j.js";import{a as r,c as i,d as a,f as o,i as s,l as c,m as l,n as u,o as d,p as f,r as p,t as m,u as h}from"./index-CJDdzIt3.js";import{A as g,Bt as _,C as v,Ct as y,En as b,Et as x,Gt as S,It as C,Jt as w,N as T,Ot as E,P as D,Q as O,S as k,Sn as A,T as j,Xt as M,Yt as N,_n as P,_t as F,b as I,ct as ee,dt as L,gn as R,h as z,j as B,kt as V,l as H,m as U,mt as te,n as ne,nt as W,o as re,pn as ie,pt as ae,s as oe,t as se,ut as G,vn as ce,w as le,wt as ue,x as de,xn as K,yt as fe,z as pe}from"./three-DPeXgOaA.js";var q=e(t(),1),J=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},me=new ue(-1,1,1,-1,0,1),he=new class extends H{constructor(){super(),this.setAttribute(`position`,new g([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new g([0,2,0,0,2,0],2))}},Y=class{constructor(e){this._mesh=new L(he,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,me)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},ge=class extends w{constructor(){super(),this.name=`RoomEnvironment`,this.position.y=-3.5;let e=new oe;e.deleteAttribute(`uv`);let t=new F({side:1}),n=new F,r=new V(16777215,900,28,2);r.position.set(.418,16.199,.3),this.add(r);let i=new L(e,t);i.position.set(-.757,13.219,.717),i.scale.set(31.713,28.305,28.591),this.add(i);let a=new pe(e,n,6),o=new y;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);let s=new L(e,_e(50));s.position.set(-16.116,14.37,8.208),s.scale.set(.1,2.428,2.739),this.add(s);let c=new L(e,_e(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let l=new L(e,_e(17));l.position.set(14.904,12.198,-1.832),l.scale.set(.15,4.265,6.331),this.add(l);let u=new L(e,_e(43));u.position.set(-.462,8.89,14.52),u.scale.set(4.38,5.441,.088),this.add(u);let d=new L(e,_e(20));d.position.set(3.235,11.486,-12.541),d.scale.set(2.5,2,.1),this.add(d);let f=new L(e,_e(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function _e(e){return new ae({color:0,emissive:16777215,emissiveIntensity:e})}var ve={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},ye=class extends J{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof N?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=R.clone(e.uniforms),this.material=new N({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new Y(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},be=class extends J{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},xe=class extends J{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},Se=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new K);this._width=n.width,this._height=n.height,t=new b(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:D}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ye(ve),this.copyPass.material.blending=0,this.timer=new ie}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}be!==void 0&&(r instanceof be?n=!0:r instanceof xe&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new K);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},Ce=class extends J{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new U}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},X={name:`GTAOShader`,defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new K},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new G},cameraProjectionMatrixInverse:{value:new G},cameraWorldMatrix:{value:new G},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new A(-1,-1,-1)},sceneBoxMax:{value:new A(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).r;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).r;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);

			#ifdef USE_REVERSED_DEPTH_BUFFER
				if (depth <= 0.0) {
					discard;
					return;
				}
			#else
				if (depth >= 1.0) {
					discard;
					return;
				}
			#endif
			
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				#if PERSPECTIVE_CAMERA == 1
					vec3 viewDir = normalize(-viewPos.xyz);
				#else
					vec3 viewDir = vec3(0., 0., 1.);
				#endif
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},Z={name:`GTAODepthShader`,defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},Q={name:`GTAOBlendShader`,uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`};function we(e=5){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),n=Te(t),r=n.length,i=new Uint8Array(r*4);for(let e=0;e<r;++e){let t=n[e],a=2*Math.PI*t/r,o=new A(Math.cos(a),Math.sin(a),0).normalize();i[e*4]=(o.x*.5+.5)*255,i[e*4+1]=(o.y*.5+.5)*255,i[e*4+2]=127,i[e*4+3]=255}let a=new I(i,t,t);return a.wrapS=S,a.wrapT=S,a.needsUpdate=!0,a}function Te(e){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),n=t*t,r=Array(n).fill(0),i=Math.floor(t/2),a=t-1;for(let e=1;e<=n;)i===-1&&a===t?(a=t-2,i=0):(a===t&&(a=0),i<0&&(i=t-1)),r[i*t+a]===0?(r[i*t+a]=e++,a++,i--):(a-=2,i++);return r}var Ee={name:`PoissonDenoiseShader`,defines:{SAMPLES:16,SAMPLE_VECTORS:De(16,2,1),NORMAL_VECTOR_TYPE:1},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new K},cameraProjectionMatrixInverse:{value:new G},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).r;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).r;
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function De(e,t,n){let r=Oe(e,t,n),i=`vec3[SAMPLES](`;for(let t=0;t<e;t++){let n=r[t];i+=`vec3(${n.x}, ${n.y}, ${n.z})${t<e-1?`,`:`)`}`}return i}function Oe(e,t,n){let r=[];for(let i=0;i<e;i++){let a=2*Math.PI*t*i/e,o=(i/(e-1))**n;r.push(new A(Math.cos(a),Math.sin(a),o))}return r}var ke=class{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let e=0;e<512;e++)this.perm[e]=this.p[e&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let n,r,i,a=.5*(Math.sqrt(3)-1),o=(e+t)*a,s=Math.floor(e+o),c=Math.floor(t+o),l=(3-Math.sqrt(3))/6,u=(s+c)*l,d=s-u,f=c-u,p=e-d,m=t-f,h,g;p>m?(h=1,g=0):(h=0,g=1);let _=p-h+l,v=m-g+l,y=p-1+2*l,b=m-1+2*l,x=s&255,S=c&255,C=this.perm[x+this.perm[S]]%12,w=this.perm[x+h+this.perm[S+g]]%12,T=this.perm[x+1+this.perm[S+1]]%12,E=.5-p*p-m*m;E<0?n=0:(E*=E,n=E*E*this._dot(this.grad3[C],p,m));let D=.5-_*_-v*v;D<0?r=0:(D*=D,r=D*D*this._dot(this.grad3[w],_,v));let O=.5-y*y-b*b;return O<0?i=0:(O*=O,i=O*O*this._dot(this.grad3[T],y,b)),70*(n+r+i)}noise3d(e,t,n){let r,i,a,o,s=(e+t+n)*(1/3),c=Math.floor(e+s),l=Math.floor(t+s),u=Math.floor(n+s),d=1/6,f=(c+l+u)*d,p=c-f,m=l-f,h=u-f,g=e-p,_=t-m,v=n-h,y,b,x,S,C,w;g>=_?_>=v?(y=1,b=0,x=0,S=1,C=1,w=0):g>=v?(y=1,b=0,x=0,S=1,C=0,w=1):(y=0,b=0,x=1,S=1,C=0,w=1):_<v?(y=0,b=0,x=1,S=0,C=1,w=1):g<v?(y=0,b=1,x=0,S=0,C=1,w=1):(y=0,b=1,x=0,S=1,C=1,w=0);let T=g-y+d,E=_-b+d,D=v-x+d,O=g-S+2*d,k=_-C+2*d,A=v-w+2*d,j=g-1+3*d,M=_-1+3*d,N=v-1+3*d,P=c&255,F=l&255,I=u&255,ee=this.perm[P+this.perm[F+this.perm[I]]]%12,L=this.perm[P+y+this.perm[F+b+this.perm[I+x]]]%12,R=this.perm[P+S+this.perm[F+C+this.perm[I+w]]]%12,z=this.perm[P+1+this.perm[F+1+this.perm[I+1]]]%12,B=.6-g*g-_*_-v*v;B<0?r=0:(B*=B,r=B*B*this._dot3(this.grad3[ee],g,_,v));let V=.6-T*T-E*E-D*D;V<0?i=0:(V*=V,i=V*V*this._dot3(this.grad3[L],T,E,D));let H=.6-O*O-k*k-A*A;H<0?a=0:(H*=H,a=H*H*this._dot3(this.grad3[R],O,k,A));let U=.6-j*j-M*M-N*N;return U<0?o=0:(U*=U,o=U*U*this._dot3(this.grad3[z],j,M,N)),32*(r+i+a+o)}noise4d(e,t,n,r){let i=this.grad4,a=this.simplex,o=this.perm,s=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20,l,u,d,f,p,m=(e+t+n+r)*s,h=Math.floor(e+m),g=Math.floor(t+m),_=Math.floor(n+m),v=Math.floor(r+m),y=(h+g+_+v)*c,b=h-y,x=g-y,S=_-y,C=v-y,w=e-b,T=t-x,E=n-S,D=r-C,O=w>T?32:0,k=w>E?16:0,A=T>E?8:0,j=w>D?4:0,M=T>D?2:0,N=+(E>D),P=O+k+A+j+M+N,F=+(a[P][0]>=3),I=+(a[P][1]>=3),ee=+(a[P][2]>=3),L=+(a[P][3]>=3),R=+(a[P][0]>=2),z=+(a[P][1]>=2),B=+(a[P][2]>=2),V=+(a[P][3]>=2),H=+(a[P][0]>=1),U=+(a[P][1]>=1),te=+(a[P][2]>=1),ne=+(a[P][3]>=1),W=w-F+c,re=T-I+c,ie=E-ee+c,ae=D-L+c,oe=w-R+2*c,se=T-z+2*c,G=E-B+2*c,ce=D-V+2*c,le=w-H+3*c,ue=T-U+3*c,de=E-te+3*c,K=D-ne+3*c,fe=w-1+4*c,pe=T-1+4*c,q=E-1+4*c,J=D-1+4*c,me=h&255,he=g&255,Y=_&255,ge=v&255,_e=o[me+o[he+o[Y+o[ge]]]]%32,ve=o[me+F+o[he+I+o[Y+ee+o[ge+L]]]]%32,ye=o[me+R+o[he+z+o[Y+B+o[ge+V]]]]%32,be=o[me+H+o[he+U+o[Y+te+o[ge+ne]]]]%32,xe=o[me+1+o[he+1+o[Y+1+o[ge+1]]]]%32,Se=.6-w*w-T*T-E*E-D*D;Se<0?l=0:(Se*=Se,l=Se*Se*this._dot4(i[_e],w,T,E,D));let Ce=.6-W*W-re*re-ie*ie-ae*ae;Ce<0?u=0:(Ce*=Ce,u=Ce*Ce*this._dot4(i[ve],W,re,ie,ae));let X=.6-oe*oe-se*se-G*G-ce*ce;X<0?d=0:(X*=X,d=X*X*this._dot4(i[ye],oe,se,G,ce));let Z=.6-le*le-ue*ue-de*de-K*K;Z<0?f=0:(Z*=Z,f=Z*Z*this._dot4(i[be],le,ue,de,K));let Q=.6-fe*fe-pe*pe-q*q-J*J;return Q<0?p=0:(Q*=Q,p=Q*Q*this._dot4(i[xe],fe,pe,q,J)),27*(l+u+d+f+p)}_dot(e,t,n){return e[0]*t+e[1]*n}_dot3(e,t,n,r){return e[0]*t+e[1]*n+e[2]*r}_dot4(e,t,n,r,i){return e[0]*t+e[1]*n+e[2]*r+e[3]*i}},Ae=class e extends J{constructor(e,t,n=512,r=512,i,a,o){super(),this.width=n,this.height=r,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=we(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new b(this.width,this.height,{type:D,depthBuffer:!1}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new N({defines:Object.assign({},X.defines),uniforms:R.clone(X.uniforms),vertexShader:X.vertexShader,fragmentShader:X.fragmentShader,blending:0,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=+!!this.camera.isPerspectiveCamera,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new te,this.normalMaterial.blending=0,this.pdMaterial=new N({defines:Object.assign({},Ee.defines),uniforms:R.clone(Ee.uniforms),vertexShader:Ee.vertexShader,fragmentShader:Ee.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new N({defines:Object.assign({},Z.defines),uniforms:R.clone(Z.uniforms),vertexShader:Z.vertexShader,fragmentShader:Z.fragmentShader,blending:0}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new N({uniforms:R.clone(ve.uniforms),vertexShader:ve.vertexShader,fragmentShader:ve.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:208,blendDst:200,blendEquation:100,blendSrcAlpha:206,blendDstAlpha:200,blendEquationAlpha:100}),this.blendMaterial=new N({uniforms:R.clone(Q.uniforms),vertexShader:Q.vertexShader,fragmentShader:Q.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:5,blendSrc:208,blendDst:200,blendEquation:100,blendSrcAlpha:206,blendDstAlpha:200,blendEquationAlpha:100}),this._fsQuad=new Y(null),this._originalClearColor=new U,this.setGBuffer(i?i.depthTexture:void 0,i?i.normalTexture:void 0),a!==void 0&&this.updateGtaoMaterial(a),o!==void 0&&this.updatePdMaterial(o)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget&&this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget&&this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){if(e!==void 0)this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1;else{if(this.normalRenderTarget===void 0){let e=new le;e.format=v,e.type=ce,this.normalRenderTarget=new b(this.width,this.height,{minFilter:fe,magFilter:fe,type:D,depthTexture:e})}this.depthTexture=this.normalRenderTarget.depthTexture,this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0}let n=+!!this.normalTexture;this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.needsUpdate=!0,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.needsUpdate=!0,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&+!!e.screenSpaceRadius!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=+!!e.screenSpaceRadius,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=De(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(t,n,r){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(t,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(t,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(t,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case e.OUTPUT.Off:break;case e.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=r.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(t,this.depthRenderMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalTexture||null,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=r.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(t,this.blendMaterial,this.renderToScreen?null:n);break;default:console.warn(`THREE.GTAOPass: Unknown output type.`)}}_renderPass(e,t,n,r,i){e.getClearColor(this._originalClearColor);let a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,r!=null&&(e.setClearColor(r),e.setClearAlpha(i||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_renderOverride(e,t,n,r,i){e.getClearColor(this._originalClearColor);let a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,r=t.clearColor||r,i=t.clearAlpha||i,r!=null&&(e.setClearColor(r),e.setClearAlpha(i||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_overrideVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(e){(e.isPoints||e.isLine||e.isLine2)&&e.visible&&(e.visible=!1,t.push(e))})}_restoreVisibility(){let e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){let t=new ke,n=e*e*4,r=new Uint8Array(n);for(let n=0;n<e;n++)for(let i=0;i<e;i++){let a=n,o=i;r[(n*e+i)*4]=(t.noise(a,o)*.5+.5)*255,r[(n*e+i)*4+1]=(t.noise(a+e,o)*.5+.5)*255,r[(n*e+i)*4+2]=(t.noise(a,o+e)*.5+.5)*255,r[(n*e+i)*4+3]=(t.noise(a+e,o+e)*.5+.5)*255}let i=new I(r,e,e,C,P);return i.wrapS=S,i.wrapT=S,i.needsUpdate=!0,i}};Ae.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};var je={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},Me=class extends J{constructor(){super(),this.isOutputPass=!0,this.uniforms=R.clone(je.uniforms),this.material=new _({name:je.name,uniforms:this.uniforms,vertexShader:je.vertexShader,fragmentShader:je.fragmentShader}),this._fsQuad=new Y(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},z.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},Ne=class extends de{constructor(e){super(e),this.type=D}parse(e){let t=function(e,t){switch(e){case 1:throw Error(`THREE.HDRLoader: Read Error: `+(t||``));case 2:throw Error(`THREE.HDRLoader: Write Error: `+(t||``));case 3:throw Error(`THREE.HDRLoader: Bad File Format: `+(t||``));default:case 4:throw Error(`THREE.HDRLoader: Memory Error: `+(t||``))}},n=function(e,t,n){t||=1024;let r=e.pos,i=-1,a=0,o=``,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));for(;0>(i=s.indexOf(`
`))&&a<t&&r<e.byteLength;)o+=s,a+=s.length,r+=128,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));return-1<i&&(!1!==n&&(e.pos+=a+i+1),o+s.slice(0,i))},r=function(e){let r=/^#\?(\S+)/,i=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,a=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,o=/^\s*FORMAT=(\S+)\s*$/,s=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,c={valid:0,string:``,comments:``,programtype:`RGBE`,format:``,gamma:1,exposure:1,width:0,height:0},l,u;for((e.pos>=e.byteLength||!(l=n(e)))&&t(1,`no header found`),(u=l.match(r))||t(3,`bad initial token`),c.valid|=1,c.programtype=u[1],c.string+=l+`
`;l=n(e),!1!==l;)if(c.string+=l+`
`,l.charAt(0)===`#`)c.comments+=l+`
`;else if((u=l.match(i))&&(c.gamma=parseFloat(u[1])),(u=l.match(a))&&(c.exposure=parseFloat(u[1])),(u=l.match(o))&&(c.valid|=2,c.format=u[1]),(u=l.match(s))&&(c.valid|=4,c.height=parseInt(u[1],10),c.width=parseInt(u[2],10)),c.valid&2&&c.valid&4)break;return c.valid&2||t(3,`missing format specifier`),c.valid&4||t(3,`missing image size specifier`),c},i=function(e,n,r){let i=n;if(i<8||i>32767||e[0]!==2||e[1]!==2||e[2]&128)return new Uint8Array(e);i!==(e[2]<<8|e[3])&&t(3,`wrong scanline width`);let a=new Uint8Array(4*n*r);a.length||t(4,`unable to allocate buffer space`);let o=0,s=0,c=4*i,l=new Uint8Array(4),u=new Uint8Array(c),d=r;for(;d>0&&s<e.byteLength;){s+4>e.byteLength&&t(1),l[0]=e[s++],l[1]=e[s++],l[2]=e[s++],l[3]=e[s++],(l[0]!=2||l[1]!=2||(l[2]<<8|l[3])!=i)&&t(3,`bad rgbe scanline format`);let n=0,r;for(;n<c&&s<e.byteLength;){r=e[s++];let i=r>128;if(i&&(r-=128),(r===0||n+r>c)&&t(3,`bad scanline data`),i){let t=e[s++];for(let e=0;e<r;e++)u[n++]=t}else u.set(e.subarray(s,s+r),n),n+=r,s+=r}let f=i;for(let e=0;e<f;e++){let t=0;a[o]=u[e+t],t+=i,a[o+1]=u[e+t],t+=i,a[o+2]=u[e+t],t+=i,a[o+3]=u[e+t],o+=4}d--}return a},a=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=e[t+0]*i,n[r+1]=e[t+1]*i,n[r+2]=e[t+2]*i,n[r+3]=1},o=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=k.toHalfFloat(Math.min(e[t+0]*i,65504)),n[r+1]=k.toHalfFloat(Math.min(e[t+1]*i,65504)),n[r+2]=k.toHalfFloat(Math.min(e[t+2]*i,65504)),n[r+3]=k.toHalfFloat(1)},s=new Uint8Array(e);s.pos=0;let c=r(s),l=c.width,u=c.height,d=i(s.subarray(s.pos),l,u),f,p,m;switch(this.type){case B:m=d.length/4;let e=new Float32Array(m*4);for(let t=0;t<m;t++)a(d,t*4,e,t*4);f=e,p=B;break;case D:m=d.length/4;let t=new Uint16Array(m*4);for(let e=0;e<m;e++)o(d,e*4,t,e*4);f=t,p=D;break;default:throw Error(`THREE.HDRLoader: Unsupported type: `+this.type)}return{width:l,height:u,data:f,header:c.string,gamma:c.gamma,exposure:c.exposure,type:p,colorSpace:W,minFilter:O,magFilter:O,generateMipmaps:!1,flipY:!0}}setDataType(e){return this.type=e,this}},Pe=[{id:`estudio`,nome:`Estúdio`},{id:`branco`,nome:`Branco`},{id:`transparente`,nome:`Transparente`}],Fe=[{id:`simples`,nome:`Simples`,sol:2.2},{id:`foto`,nome:`Estúdio de foto`,arquivo:`studio_small_09_1k.hdr`,sol:1.2},{id:`ceu`,nome:`Céu aberto`,arquivo:`kloofendal_48d_partly_cloudy_puresky_1k.hdr`,sol:2.6}],Ie={estudio:`#c9ced8`,branco:`#ffffff`};function Le(e,t=!0){let n=e=>t?{}:{transparent:!0,opacity:e,depthWrite:!1},r=new Map,i=(e,t)=>(r.has(e)||r.set(e,t()),r.get(e));return e.traverse(e=>{let r=e;if(!r.isMesh)return;let a=Array.isArray(r.material)?r.material[0]:r.material,o=a?.color?`#${a.color.getHexString()}`:`#cccccc`,s=``;for(let t=e;t&&!s;t=t.parent)s=t.userData?.papel??``;let c,l=s===`parede`||s===`piso`||s===`esquadria`;c=s===`parede`?i(`parede`,()=>new F({color:`#eeebe4`,roughness:.92,metalness:0,...n(.3)})):s===`piso`?i(`piso`,()=>new F({color:`#b9b4aa`,roughness:.8,metalness:0,...n(.5)})):s===`esquadria`?i(`esquadria`,()=>new F({color:`#8b6a4a`,roughness:.6,metalness:0,...n(.3)})):i(`pvc|${o}`,()=>new F({color:o,roughness:.38,metalness:.05,side:2})),r.material=c,r.castShadow=t||!l,r.receiveShadow=!0}),{materiais:[...r.values()],descartar:()=>{for(let e of r.values())e.dispose()}}}function Re(e=256,t=128){let n=new Float32Array(e*t*4),r=[[Math.PI*.25,Math.PI*.25,7],[Math.PI*1.25,Math.PI*.3,4]];for(let i=0;i<t;i++){let a=(.5-(i+.5)/t)*Math.PI,o=a>0?.55+.45*Math.sin(a):.35+.1*Math.sin(a);for(let t=0;t<e;t++){let s=(t+.5)/e*Math.PI*2,c=o;for(let[e,t,n]of r){let r=Math.atan2(Math.sin(s-e),Math.cos(s-e)),i=a-t;c+=n*Math.exp(-(r*r+i*i)/.02)}let l=(i*e+t)*4;n[l]=c,n[l+1]=c*.98,n[l+2]=c*.95,n[l+3]=1}}let i=new I(n,e,t,C,B);return i.mapping=303,i.colorSpace=W,i.needsUpdate=!0,i}function ze(e){let t=document.createElement(`canvas`);t.className=`render-canvas`,t.setAttribute(`role`,`img`),t.setAttribute(`aria-label`,`Render 3D`);let n;try{n=new ne({canvas:t,antialias:!0,alpha:!0,preserveDrawingBuffer:!0})}catch{return null}e.prepend(t),n.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),n.toneMapping=4,n.toneMappingExposure=1.05,n.shadowMap.enabled=!0,n.shadowMap.type=1;let i=new w,a=new se(n),o=new Map;o.set(`simples`,{rapido:a.fromScene(new ge,.04).texture,raios:Re()});let s=`simples`,c=!1,l=()=>o.get(s);i.environment=l().rapido;let u=new j(16777215,2.2);u.castShadow=!0,u.shadow.mapSize.set(2048,2048),u.shadow.radius=4,u.shadow.bias=-4e-4,u.shadow.normalBias=.02,i.add(u,u.target);let d=new L(new E(1,1).rotateX(-Math.PI/2),new M({opacity:.22}));d.receiveShadow=!0,i.add(d);let f=new T;i.add(f);let p=()=>{},h=!0,g=()=>{let e=p;p=Le(f,h).descartar,e()},_=new x(40,1,.05,500),v=new m(_,t);v.enableDamping=!0;let y=new Se(n);y.addPass(new Ce(i,_));let b=new Ae(i,_,1,1);y.addPass(b),y.addPass(new Me);let S=`estudio`,C=()=>{S===`transparente`?(i.background=null,n.setClearColor(0,0)):(i.background=new U(Ie[S]),n.setClearColor(Ie[S],1)),d.visible=S!==`transparente`};C();let D=1,O=1,k=()=>{let r=e.getBoundingClientRect();D=Math.max(1,Math.floor(r.width)),O=Math.max(1,Math.floor(r.height)),n.setSize(D,O,!1),y.setSize(D,O),_.aspect=D/O,_.updateProjectionMatrix(),t.style.width=`100%`,t.style.height=`100%`},N=new ResizeObserver(()=>{k(),z&&(I(),z.updateCamera())});N.observe(e),k();let P=()=>{S===`transparente`?n.render(i,_):y.render()},F=null,I=()=>{F&&(F.position.copy(_.position),F.quaternion.copy(_.quaternion),F.fov=_.fov,F.aspect=_.aspect,F.near=_.near,F.far=_.far,F.updateProjectionMatrix(),F.updateMatrixWorld(),F.focusDistance=_.position.distanceTo(v.target),F.fStop=c?Math.max(.05,F.focusDistance/40):1e6,F.apertureBlades=c?6:0)},R=null,z=null,B;v.addEventListener(`change`,()=>{z&&(I(),z.updateCamera())});let V=0,H=!1,te=()=>{V=requestAnimationFrame(te),H||(v.update(),z?(z.renderSample(),B?.(z.samples)):P())};te();function W(){let e=new re().setFromObject(f);e.isEmpty()&&e.set(new A(-2,0,-2),new A(2,2,2));let t=e.getCenter(new A),n=e.getSize(new A),r=Math.max(n.length()/2,.5),i=ee.degToRad(_.fov/2),a=Math.min(i,Math.atan(Math.tan(i)*_.aspect)),o=r/Math.sin(a)*(_.aspect<1?1:.92);v.target.copy(t),_.position.copy(t).add(new A(.85,.62,1).normalize().multiplyScalar(o)),_.near=o/200,_.far=o*20,_.updateProjectionMatrix(),v.update();let s=Math.max(n.x,n.z,1)*1.6;u.position.copy(t).add(new A(.6,1.4,.8).normalize().multiplyScalar(r*3)),u.target.position.copy(t);let c=u.shadow.camera;c.left=c.bottom=-s,c.right=c.top=s,c.near=.01,c.far=r*8,c.updateProjectionMatrix(),d.position.set(t.x,e.min.y-.001,t.z),d.scale.set(s*3,1,s*3),z&&(I(),z.updateCamera())}async function ie(e){return new Promise((t,n)=>e.toBlob(e=>e?t(e):n(Error(`o navegador não gerou a imagem.`)),`image/png`))}return{definirModelo(e){for(let e of[...f.children])f.remove(e);f.add(e),g(),W(),z&&z.setScene(i,F)},definirFundo(e){S=e,C(),z&&z.setScene(i,F)},async definirLuz(e){let t=Fe.find(t=>t.id===e);if(!o.has(e)){let n=await new Ne().loadAsync(`./hdri/${t.arquivo}`);n.mapping=303,o.set(e,{rapido:a.fromEquirectangular(n).texture,raios:n})}s=e,u.intensity=t.sol,i.environment=z?l().raios:l().rapido,z&&(z.updateEnvironment(),z.reset())},definirDesfoque(e){c=e,z&&(I(),z.updateCamera())},definirParedes(e){e!==h&&(h=e,g(),z&&z.setScene(i,F))},enquadrar:W,async imagem(e){let r=n.getPixelRatio();H=!0;try{return n.setPixelRatio(e),n.setSize(D,O,!1),y.setPixelRatio(e),y.setSize(D,O),z?z.renderSample():P(),await ie(t)}finally{n.setPixelRatio(r),y.setPixelRatio(r),k(),H=!1}},async video(e,n){let r=t.captureStream(30),i=[`video/webm;codecs=vp9`,`video/webm;codecs=vp8`,`video/webm`].find(e=>MediaRecorder.isTypeSupported(e));if(!i)throw Error(`este navegador não grava vídeo WebM.`);let a=new MediaRecorder(r,{mimeType:i,videoBitsPerSecond:8e6}),o=[];a.ondataavailable=e=>{e.data.size&&o.push(e.data)};let s=new Promise(e=>{a.onstop=()=>e()}),c=_.position.clone().sub(v.target),l=performance.now();return a.start(250),await new Promise(t=>{let r=()=>{let i=Math.min((performance.now()-l)/(e*1e3),1);_.position.copy(v.target).add(c.clone().applyAxisAngle(new A(0,1,0),i*Math.PI*2)),_.lookAt(v.target),n?.(i),i<1?requestAnimationFrame(r):t()};r()}),a.stop(),await s,r.getTracks().forEach(e=>e.stop()),_.position.copy(v.target).add(c),v.update(),new Blob(o,{type:`video/webm`})},async caminhoDeRaios(e,t){if(!e)z=null,B=void 0,i.environment=l().rapido;else if(!z){if(!R){let{WebGLPathTracer:e,PhysicalCamera:t}=await r(async()=>{let{WebGLPathTracer:e,PhysicalCamera:t}=await import(`./src-2ff0ZTyZ.js`);return{WebGLPathTracer:e,PhysicalCamera:t}},__vite__mapDeps([0,1]),import.meta.url);F=new t,R=new e(n),R.minSamples=1,R.renderScale=Math.min(window.devicePixelRatio||1,2)>=2?.75:1}i.environment=l().raios,I();try{R.setScene(i,F)}catch(e){throw i.environment=l().rapido,e}z=R,B=t}},estado(){let e=0;return f.traverse(t=>{t.isMesh&&e++}),{malhas:e,fundo:S,luz:s,desfoque:c,caminho:!!z,amostras:z?.samples??0,compilando:!!z?.isCompiling,largura:D,altura:O}},destruir(){cancelAnimationFrame(V),N.disconnect(),R?.dispose(),v.dispose(),p(),b.dispose?.(),y.dispose();for(let e of o.values())e.rapido.dispose(),e.raios.dispose();a.dispose(),n.dispose(),t.remove()}}}var $=n();function Be(){let e=(0,q.useRef)(null),t=(0,q.useRef)(null),[n,r]=(0,q.useState)(`estudio`),[m,g]=(0,q.useState)(`simples`),[_,v]=(0,q.useState)(!1),[y,b]=(0,q.useState)(!1),[x,S]=(0,q.useState)(null),C=(0,q.useRef)(!1),w=(0,q.useRef)(()=>{}),[T,E]=(0,q.useState)(2),[D,O]=(0,q.useState)(null),[k,A]=(0,q.useState)(null),[j,M]=(0,q.useState)(!1),[N,P]=(0,q.useState)(0),[F,I]=(0,q.useState)([0,0]),[ee,L]=(0,q.useState)(!1),[R,z]=(0,q.useState)(!1),B=l(e=>e.paredesOpacas),V=l(e=>e.alternarParedes);(0,q.useEffect)(()=>{t.current?.definirParedes(B)},[B]),(0,q.useEffect)(()=>{let n=ze(e.current);if(!n){z(!0);return}t.current=n,n.definirParedes(f().getState().paredesOpacas);let r=()=>{},i=()=>{let e=s(d.getState(),{explodir:C.current});n.definirModelo(e.grupo),r(),r=e.soltar,L(e.vazio),S(e.explosao&&e.explosao.length?`Vista explodida: ${e.explosao.map(e=>e.dz?`${e.nome} +${e.dz.toLocaleString(`pt-BR`,{minimumFractionDigits:2})} m`:`${e.nome} no lugar`).join(` · `)}.`:null)};w.current=i,i();let a=d.subscribe((e,t)=>{(e.rede!==t.rede||e.desenho!==t.desenho||e.tracos!==t.tracos||e.externo!==t.externo)&&i()}),o=window.setInterval(()=>{let e=n.estado();I([e.largura,e.altura])},500);return()=>{a(),clearInterval(o),n.destruir(),r(),t.current=null}},[]);let H=e=>{r(e),t.current?.definirFundo(e)},U=async e=>{let n=t.current;if(!n)return;let r=m;g(e),A(`Carregando a luz…`);try{await n.definirLuz(e),O(null)}catch(e){g(r),O({texto:`Não consegui carregar essa luz: ${e.message}`,erro:!0})}finally{A(null)}},te=()=>{let e=!y;b(e),C.current=e,w.current()},ne=()=>{let e=!_;v(e),t.current?.definirDesfoque(e)},W=async()=>{let e=t.current;if(e){A(`Gerando a imagem…`);try{let t=await e.imagem(T),r=`${p()}-render-${T}x${n===`transparente`?`-transparente`:``}.png`;u(r,t),O({texto:`${r} salvo: ${F[0]*T} × ${F[1]*T} px${n===`transparente`?`, fundo transparente`:``}.`})}catch(e){O({texto:`Não consegui gerar a imagem: ${e.message}`,erro:!0})}finally{A(null)}}},re=async()=>{let e=t.current;if(e){A(`Gravando: 0%`);try{let t=await e.video(6,e=>A(`Gravando: ${Math.round(e*100)}%`)),n=`${p()}-girando.webm`;u(n,t),O({texto:`${n} salvo: 6 s, uma volta completa (${(t.size/1e6).toLocaleString(`pt-BR`,{maximumFractionDigits:1})} MB).`})}catch(e){O({texto:`Não consegui gravar: ${e.message}`,erro:!0})}finally{A(null)}}},ie=async()=>{let e=t.current;if(e){if(j)await e.caminhoDeRaios(!1),M(!1),O({texto:`Render final parado. "Salvar imagem" agora usa o render rápido.`});else{A(`Preparando o render final…`);try{P(0),await e.caminhoDeRaios(!0,P),M(!0),O({texto:`Render final ligado. Na primeira vez o navegador prepara os shaders (pode levar 1 a 2 minutos); depois a imagem fica mais limpa a cada amostra. "Salvar imagem" salva o que estiver na tela. Girar recomeça.`})}catch(e){O({texto:`Render final indisponível neste computador (${e.message}). O render rápido continua.`,erro:!0})}finally{A(null)}}}};return R?(0,$.jsxs)(`div`,{className:`pagina-render`,children:[(0,$.jsx)(`p`,{className:`ba-aviso aviso-erro`,role:`alert`,children:`Este navegador não tem WebGL: o render precisa dele.`}),(0,$.jsx)(`div`,{ref:e,hidden:!0})]}):(0,$.jsxs)(`div`,{className:`pagina-render`,children:[(0,$.jsxs)(`div`,{className:`render-barra`,children:[(0,$.jsx)(`div`,{className:`render-grupo`,role:`radiogroup`,"aria-label":`Fundo`,children:Pe.map(e=>(0,$.jsx)(`button`,{type:`button`,role:`radio`,"aria-checked":n===e.id,className:`btn`,onClick:()=>H(e.id),children:e.nome},e.id))}),(0,$.jsxs)(`label`,{className:`ba-campo`,children:[`Luz`,(0,$.jsx)(`select`,{value:m,disabled:!!k,onChange:e=>void U(e.target.value),children:Fe.map(e=>(0,$.jsx)(`option`,{value:e.id,children:e.nome},e.id))})]}),(0,$.jsxs)(`span`,{className:`render-saidas`,children:[(0,$.jsxs)(`label`,{className:`ba-campo`,children:[`Tamanho`,(0,$.jsx)(`select`,{value:T,onChange:e=>E(Number(e.target.value)),children:[1,2,4].map(e=>(0,$.jsxs)(`option`,{value:e,children:[e,`× · `,F[0]*e,` × `,F[1]*e]},e))})]}),(0,$.jsx)(`button`,{type:`button`,className:`btn btn-primario`,disabled:!!k,onClick:()=>void W(),children:`Salvar imagem`}),(0,$.jsx)(`button`,{type:`button`,className:`btn`,disabled:!!k||j,onClick:()=>void re(),title:j?`Pare o render final para gravar`:`Uma volta de 6 s em WebM`,children:`Gravar vídeo`}),(0,$.jsx)(`button`,{type:`button`,className:`btn`,"aria-pressed":j,disabled:!!k&&!j,onClick:()=>void ie(),children:j?`Parar render final · ${N>=1?`${Math.floor(N)} amostras`:`preparando`}`:`Render final`}),(0,$.jsxs)(i,{children:[(0,$.jsx)(o,{asChild:!0,children:(0,$.jsx)(`button`,{type:`button`,className:`btn`,children:`Mais ▾`})}),(0,$.jsx)(a,{children:(0,$.jsxs)(h,{className:`mais`,side:`bottom`,align:`end`,sideOffset:6,collisionPadding:8,"aria-label":`Mais opções do render`,children:[(0,$.jsx)(`button`,{type:`button`,className:`btn`,onClick:()=>t.current?.enquadrar(),children:`Enquadrar`}),(0,$.jsx)(`button`,{type:`button`,className:`btn btn-alternar`,"aria-pressed":B,onClick:V,children:`Paredes opacas`}),(0,$.jsx)(`button`,{type:`button`,className:`btn btn-alternar`,"aria-pressed":y,onClick:te,children:`Vista explodida`}),(0,$.jsx)(`button`,{type:`button`,className:`btn btn-alternar`,"aria-pressed":_,disabled:!j,onClick:ne,children:`Desfoque`}),(0,$.jsxs)(`p`,{className:`ba-nota`,children:[j?`Desfoque: foco no centro da órbita (botão direito move o centro).`:`Desfoque só no render final.`,` "Paredes opacas" é o mesmo botão do Desenhar.`]}),(0,$.jsx)(c,{className:`mais-seta`})]})})]})]})]}),(0,$.jsx)(`p`,{className:`ba-aviso render-msg${D?.erro&&!k?` aviso-erro`:``}`,role:D?.erro&&!k?`alert`:`status`,children:k??D?.texto??``}),(0,$.jsx)(`div`,{ref:e,className:`render-palco`,children:ee&&(0,$.jsx)(`p`,{className:`render-vazio`,children:`Nada para renderizar ainda. Abra uma planta ou desenhe no modo Desenhar.`})}),x&&(0,$.jsx)(`p`,{className:`ba-nota render-legenda`,children:x}),(0,$.jsx)(`p`,{className:`ba-nota render-dica`,children:`Arrastar gira, roda do mouse aproxima, botão direito move. Fundo transparente sai sem a sombra e sem a oclusão.`})]})}export{Be as PaginaRender,Y as t};