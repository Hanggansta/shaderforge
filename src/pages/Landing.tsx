import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { PRESETS } from '../shader-agent/presets';
import {
  IconArrowRight,
  IconPlay,
  IconCpu,
  IconShield,
  IconSpark,
  IconUsers,
} from '../components/icons/ForgeIcons';

function HeroShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true });
    if (!gl) return;
    const glCtx: WebGL2RenderingContext = gl;

    const vertex = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragment = `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        float t = iTime * 0.2;
        float r = length(uv);
        float angle = atan(uv.y, uv.x);

        float grid = smoothstep(0.92, 0.98, abs(fract(uv.x * 9.0 + t * 0.6) - 0.5) * 2.0);
        grid += smoothstep(0.92, 0.98, abs(fract(uv.y * 7.0 - t * 0.4) - 0.5) * 2.0);

        float dust = noise(uv * 3.5 + t * 0.15) * 0.6 + noise(uv * 8.0 - t * 0.3) * 0.4;
        dust = pow(dust, 1.6);

        float rings = sin(r * 22.0 - t * 3.5) * 0.5 + 0.5;
        rings *= smoothstep(0.6, 0.15, r);

        vec3 col = vec3(0.02, 0.03, 0.08);
        col += vec3(0.0, 0.85, 1.0) * (grid * 0.12 + dust * 0.55);
        col += vec3(0.55, 0.1, 0.95) * rings * 0.85;
        col += vec3(1.0, 0.0, 0.6) * pow(1.0 - r, 2.8) * 0.3;

        float scan = sin(uv.y * 140.0 + t * 18.0) * 0.5 + 0.5;
        col += vec3(0.0, 0.6, 0.9) * scan * 0.035 * (1.0 - r * 0.7);

        float vig = smoothstep(1.1, 0.35, r);
        col *= vig;
        col += (hash(gl_FragCoord.xy + floor(t * 20.0)) - 0.5) * 0.018;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compile(type: number, src: string) {
      const s = glCtx.createShader(type)!;
      glCtx.shaderSource(s, src);
      glCtx.compileShader(s);
      return s;
    }

    const vs = compile(glCtx.VERTEX_SHADER, vertex);
    const fs = compile(glCtx.FRAGMENT_SHADER, fragment);
    const program = glCtx.createProgram()!;
    glCtx.attachShader(program, vs);
    glCtx.attachShader(program, fs);
    glCtx.linkProgram(program);
    glCtx.useProgram(program);

    const posLoc = glCtx.getAttribLocation(program, 'position');
    const resLoc = glCtx.getUniformLocation(program, 'iResolution');
    const timeLoc = glCtx.getUniformLocation(program, 'iTime');

    const buf = glCtx.createBuffer();
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buf);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), glCtx.STATIC_DRAW);
    glCtx.enableVertexAttribArray(posLoc);
    glCtx.vertexAttribPointer(posLoc, 2, glCtx.FLOAT, false, 0, 0);

    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      glCtx.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const t = (performance.now() - start) / 1000;
      glCtx.uniform2f(resLoc, canvas.width, canvas.height);
      glCtx.uniform1f(timeLoc, t);
      glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-shader-bg" style={{ width: '100%', height: '100%' }} />;
}

const PIPELINE = [
  { num: '01', title: 'Visual Structurer', desc: 'Prompt → structured visual intent (palette, motion, composition)' },
  { num: '02', title: 'Shader Planner', desc: 'Decompose into modules + technique requirements' },
  { num: '03', title: 'Reference Selector', desc: 'Pull proven patterns from golden shaders + technique archive' },
  { num: '04', title: 'Code Agent + Fix Loop', desc: 'Generate → real WebGL2 compile → auto-repair up to 3×' },
  { num: '05', title: 'Visual Validate', desc: 'Multi-frame render + pixel scoring. Best candidate wins.' },
];

const FEATURES = [
  { icon: IconCpu, title: 'Real compilation, not vibes', text: 'Every shader is compiled in the browser with WebGL2. You see the exact error. Then the agent fixes it — up to three times.' },
  { icon: IconShield, title: 'Visual scoring, not guesswork', text: 'We render multiple candidates and score them with pixel analysis — brightness, contrast, palette alignment, motion. The best one wins.' },
  { icon: IconSpark, title: 'Reference-driven generation', text: 'We retrieve proven techniques from golden shaders and inject them into the plan so outputs stay compilable and visually structured.' },
];

export default function Landing() {
  const featured = PRESETS.slice(0, 6);

  const openUpgrade = () => {
    window.dispatchEvent(new CustomEvent('open-upgrade'));
  };

  return (
    <div className="landing" id="main-content">
      <section className="hero-section">
        <HeroShaderBackground />
        <div className="scanline" aria-hidden="true" />

        <div className="hero-inner">
          <div className="hero-scrim" aria-hidden="true" />

          <div className="hero-badge">
            <span className="hero-badge-dot" aria-hidden="true" />
            AI shader synthesis pipeline
          </div>

          <h1 className="hero-title">
            <span className="glitch" data-text="LIGHT SHADERS">LIGHT SHADERS</span><br />
            <span className="text-accent">FROM VOID TO VISION</span>
          </h1>

          <p className="hero-subtitle">
            A fixed AI pipeline for real-time GLSL. WebGL2 compilation, visual scoring,
            and a reference archive — built for creators who need production-grade results.
          </p>

          <div className="hero-cta-row">
            <Link to="/studio" className="btn-cyber primary" style={{ fontSize: 18, padding: '16px 48px' }}>
              OPEN STUDIO <IconArrowRight size={18} />
            </Link>
            <Link to="/gallery" className="btn-cyber" style={{ fontSize: 16, padding: '14px 32px' }}>
              <IconPlay size={16} /> Explore the gallery
            </Link>
          </div>

          <div className="hero-stats-row">
            <span>REAL-TIME WEBGL2</span>
            <span>AUTO-REPAIR LOOP</span>
            <span>VISUAL SCORING</span>
            <span>NON-BLACK OUTPUT</span>
          </div>
        </div>

        <div className="hero-scroll-hint" aria-hidden="true">
          SCROLL TO BEGIN <span className="hero-scroll-line" />
        </div>
      </section>

      <div className="stats-bar">
        <div className="stats-bar-inner">
          <div className="row row-center row-gap-sm text-muted">
            <IconUsers className="icon-md" />
            <span>4,872 creators building in the last 24h</span>
          </div>
          <div className="stats-metrics">
            <div><span className="text-accent stat-number">142k</span> SHADERS LIT</div>
            <div><span className="text-accent-violet stat-number">97.4</span>% FIRST-PASS COMPILE</div>
            <div><span className="text-accent-magenta stat-number">3.1</span> AVG ATTEMPTS</div>
          </div>
        </div>
      </div>

      <section id="how" className="page-container section-block">
        <div className="section-header-row">
          <div>
            <div className="eyebrow-label">The lumen pipeline</div>
            <h2 className="section-heading">Five steps.<br />Zero hand-waving.</h2>
          </div>
          <p className="section-aside">
            Every generation follows a deterministic, auditable pipeline. No magic — just rigorous engineering.
          </p>
        </div>

        <div className="pipeline-grid">
          {PIPELINE.map((step, i) => (
            <motion.div
              key={step.num}
              className="holo-card grain"
              style={{ padding: 20 }}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { type: 'spring', stiffness: 120, damping: 20, delay: i * 0.035 },
                },
              }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-50px' }}
              whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 15 } }}
            >
              <div className="pipeline-card-num">{step.num}</div>
              <div className="pipeline-card-title">{step.title}</div>
              <div className="pipeline-card-desc">{step.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section-surface">
        <div className="page-container features-zigzag">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className={`feature-row${idx % 2 === 1 ? ' reverse' : ''}`}>
                <div className="feature-icon-wrap">
                  <Icon size={28} />
                </div>
                <div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-text">{feature.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="page-container section-block-compact">
        <div className="row row-between row-center" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow-label">Curated from the void</div>
            <h2 className="section-heading" style={{ fontSize: '2.25rem' }}>Recent masterworks</h2>
          </div>
          <Link to="/gallery" className="link-accent">
            Browse full gallery <IconArrowRight size={16} />
          </Link>
        </div>

        <div className="grid-6">
          {featured.map((preset) => (
            <Link key={preset.id} to={`/studio?preset=${preset.id}`} className="holo-card preset-card">
              <div className="preset-card-tag">{preset.tags?.[0]?.toUpperCase()}</div>
              <div className="preset-card-title">{preset.title}</div>
              <div className="preset-card-desc">{preset.description}</div>
              <div className="preset-card-cta">
                Load in studio <IconArrowRight size={13} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-surface-dark pricing-section">
        <div className="page-container" style={{ maxWidth: 720 }}>
          <div className="eyebrow-label">For individuals &amp; studios</div>
          <h2 className="section-heading" style={{ marginBottom: 16 }}>Create without limits.</h2>
          <p className="text-muted" style={{ maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Free tier for exploration. Pro for heavy creators who need priority models, higher quotas, and private archives.
          </p>

          <div className="pricing-cards">
            <div className="holo-card grain pricing-card">
              <div className="pricing-tier">Free</div>
              <div className="pricing-price tabular-nums">$0</div>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>10 generations / month</div>
              <ul className="pricing-features">
                <li>Full AI pipeline + auto-fix</li>
                <li>Public gallery access</li>
                <li>Browser WebGL2 preview</li>
              </ul>
              <Link to="/studio" className="btn-ghost modal-tier-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Start for free
              </Link>
            </div>

            <div className="holo-card grain pricing-card pricing-card-featured">
              <span className="pricing-badge">RECOMMENDED</span>
              <div className="pricing-tier pricing-tier-pro">Pro</div>
              <div className="pricing-price tabular-nums">
                $20 <span className="pricing-price-sub">/mo</span>
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>200 generations + priority queue</div>
              <ul className="pricing-features">
                <li>3× candidate generation + visual rerank</li>
                <li>Visual feedback refine loops</li>
                <li>Private projects + team sharing</li>
              </ul>
              <button type="button" onClick={openUpgrade} className="btn-cyber primary modal-tier-btn" style={{ width: '100%' }}>
                Upgrade to Pro
              </button>
            </div>
          </div>
          <p className="pricing-note">Cancel anytime. Usage-based economics. No surprise bills.</p>
        </div>
      </section>

      <section className="section-block-compact" style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', paddingInline: 24 }}>
          <h2 className="section-heading" style={{ fontSize: '2.25rem', marginBottom: 12 }}>Ready to build something that moves?</h2>
          <p className="text-muted" style={{ marginBottom: 32 }}>The best shaders aren't prompted. They're illuminated.</p>
          <Link to="/studio" className="btn-cyber primary" style={{ fontSize: 18, padding: '16px 48px', display: 'inline-flex' }}>
            Open Studio
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>ShaderLumen — AI-native real-time shader synthesis.</div>
          <nav className="footer-links" aria-label="Legal">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
          <div>© {new Date().getFullYear()} ShaderLumen. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}