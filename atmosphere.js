// Optional ambient layer: no changes to the accepted site or orbit controller.
const motion = window.SiteMotion;
const narrow = matchMedia('(max-width: 760px)');
const palettes = {
  hero: ['185,225,244', '219,239,247', '156,185,215', '183,171,209'],
  perspective: ['166,211,234', '217,236,245', '148,186,216'],
  affiliates: ['180,218,234', '225,206,169', '227,235,242']
};

function seededRandom(seed) {
  return () => {
    seed = Math.imul(1664525, seed) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
}

class AmbientField {
  constructor(kind, host, seed) {
    this.kind = kind;
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ambient-particles';
    this.canvas.dataset.field = kind;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;
    this.random = seededRandom(seed);
    this.points = Array.from({ length: kind === 'hero' ? 52 : 20 }, (_, i) => {
      const r = this.random;
      const soft = i % 11 === 0;
      return {
        x: .5 + (r() - r()) * .48,
        y: .07 + r() * .85,
        radius: soft ? 2.5 + r() * 1.5 : .45 + r() * .85,
        opacity: soft ? .15 + r() * .1 : .22 + r() * .28,
        phase: r() * Math.PI * 2,
        drift: 2.4 + r() * 3.8,
        sway: 6 + r() * 12,
        color: palettes[kind][i % palettes[kind].length],
        soft
      };
    });
    this.visible = false;
    this.time = 0;
    this.frame = null;
    this.lastTime = 0;
    this.lastPaint = 0;
    this.tick = this.tick.bind(this);
    this.place();
    new ResizeObserver(() => this.resize()).observe(this.canvas);
    new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      this.sync();
    }).observe(this.canvas);
    narrow.addEventListener('change', () => { this.place(); this.resize(); });
    motion.subscribe(() => this.sync());
    document.addEventListener('visibilitychange', () => this.sync());
    this.resize();
  }

  place() {
    // On phones, attach section particles only to the artwork—not its text.
    const parent = this.kind !== 'hero' && narrow.matches ? this.host.querySelector('.story-art') : this.host;
    parent.append(this.canvas);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const density = Math.min(devicePixelRatio || 1, narrow.matches ? 1.25 : 1.5);
    this.canvas.width = Math.max(1, Math.round(rect.width * density));
    this.canvas.height = Math.max(1, Math.round(rect.height * density));
    this.ctx.setTransform(density, 0, 0, density, 0, 0);
    this.paint();
  }

  paint() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    ctx.clearRect(0, 0, width, height);
    if (!width || !height) return;
    const time = motion.reduced ? 0 : this.time;
    const count = narrow.matches ? (this.kind === 'hero' ? 25 : 10) : this.points.length;
    for (const point of this.points.slice(0, count)) {
      const progress = ((point.y * height - time * point.drift) % height + height) % height;
      const x = point.x * width + Math.sin(time * .13 + point.phase) * point.sway;
      const edge = Math.min(1, progress / 65, (height - progress) / 65);
      const alpha = point.opacity * edge * (.9 + .1 * Math.sin(time * .25 + point.phase));
      const radius = point.radius;
      if (point.soft) {
        const gradient = ctx.createRadialGradient(x, progress, 0, x, progress, radius * 2.3);
        gradient.addColorStop(0, `rgba(${point.color},${alpha})`);
        gradient.addColorStop(.3, `rgba(${point.color},${alpha * .6})`);
        gradient.addColorStop(1, `rgba(${point.color},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius * 2.3, progress - radius * 2.3, radius * 4.6, radius * 4.6);
      } else {
        ctx.fillStyle = `rgba(${point.color},${alpha})`;
        ctx.beginPath();
        ctx.arc(x, progress, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  sync() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastTime = 0;
    this.lastPaint = 0;
    const active = this.visible && !document.hidden && !motion.reduced;
    this.canvas.dataset.motion = motion.reduced ? 'still' : active ? 'active' : 'idle';
    this.paint();
    if (active) this.frame = requestAnimationFrame(this.tick);
  }

  tick(now) {
    if (this.lastTime) this.time += Math.min(now - this.lastTime, 80) / 1000;
    this.lastTime = now;
    if (now - this.lastPaint >= 1000 / 24) {
      this.paint();
      this.lastPaint = now;
    }
    this.frame = requestAnimationFrame(this.tick);
  }
}

if (document.body.classList.contains('atmosphere-preview')) {
  const targets = [['hero', '#orbit-stage', 1701], ['perspective', '#perspective .story-layout', 2107], ['affiliates', '#affiliates .story-layout', 4601]];
  for (const [kind, selector, seed] of targets) {
    const host = document.querySelector(selector);
    if (host) new AmbientField(kind, host, seed);
  }
}
