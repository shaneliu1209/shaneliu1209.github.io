// Follow the light paths in the approved artwork, in its native 1254px space.
const ART_SIZE = 1254;
const CYAN = [157, 226, 255];
const GOLD = [255, 222, 170];
const motion = window.SiteMotion;
const makePath = (points, delay = 0, color = CYAN, speed = 7) => ({ points, delay, color, speed });
const artwork = {
  perspective: {
    paths: [
      makePath([[150, 470], [355, 240], [450, 500], [625, 590]], 0, CYAN, 5.8),
      makePath([[154, 695], [295, 960], [429, 640], [625, 590]], .5, CYAN, 6.3),
      makePath([[625, 590], [850, 648], [920, 388], [1184, 420]], .12),
      makePath([[625, 598], [895, 645], [930, 520], [1132, 542]], .43),
      makePath([[625, 607], [918, 640], [859, 758], [1188, 682]], .75)
    ],
    nodes: [[625, 594], [1184, 420], [1132, 542], [1188, 682]],
    dust: { x: 310, y: 574, rx: 218, ry: 301 }
  },
  affiliates: {
    // Keep partner connections precise; perspective retains its original lighting.
    light: { nodeRadius: 12, junctionRadius: 20, nodeOpacity: .55, trailWidth: 2, tipGlowRadius: 7, tipGlowOpacity: .3, tipRadius: 1.6, density: 2 },
    paths: [
      makePath([[463, 620], [541, 550], [566, 335], [657, 190]], 0),
      makePath([[463, 620], [641, 594], [644, 387], [908, 321]], .22),
      makePath([[463, 620], [696, 641], [756, 519], [1002, 538]], .45),
      makePath([[463, 620], [648, 670], [807, 773], [1009, 765]], .67),
      makePath([[463, 620], [610, 722], [617, 877], [879, 927]], .85),
      makePath([[463, 620], [546, 742], [534, 920], [670, 1007]], .35),
      makePath([[1096, 985], [1129, 1138], [776, 1262], [539, 1149], [398, 1091], [331, 1005], [312, 886]], .1, GOLD, 9)
    ],
    nodes: [[463, 620], [657, 190], [908, 321], [1002, 538], [1009, 765], [879, 927], [672, 1007]],
    dust: { x: 274, y: 613, rx: 191, ry: 256 }
  }
};

// Sample cubic curves once and normalize distance, so pulses travel evenly.
function samplePath(points) {
  const samples = [];
  let length = 0;
  for (let segment = 0; segment + 3 < points.length; segment += 3) {
    const [a, b, c, d] = points.slice(segment, segment + 4);
    for (let i = segment ? 1 : 0; i <= 90; i++) {
      const t = i / 90;
      const u = 1 - t;
      const x = u ** 3 * a[0] + 3 * u ** 2 * t * b[0] + 3 * u * t ** 2 * c[0] + t ** 3 * d[0];
      const y = u ** 3 * a[1] + 3 * u ** 2 * t * b[1] + 3 * u * t ** 2 * c[1] + t ** 3 * d[1];
      const previous = samples.at(-1);
      if (previous) length += Math.hypot(x - previous.x, y - previous.y);
      samples.push({ x, y, distance: length });
    }
  }
  return { samples, length };
}

function atDistance(path, progress) {
  const distance = Math.max(0, Math.min(1, progress)) * path.length;
  let low = 0;
  let high = path.samples.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (path.samples[middle].distance < distance) low = middle + 1;
    else high = middle;
  }
  const right = path.samples[low];
  const left = path.samples[Math.max(0, low - 1)];
  const mix = (distance - left.distance) / (right.distance - left.distance || 1);
  return { x: left.x + (right.x - left.x) * mix, y: left.y + (right.y - left.y) * mix };
}

class SectionLight {
  constructor(element) {
    this.element = element;
    this.canvas = element.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;
    this.config = artwork[element.dataset.art];
    this.paths = this.config.paths.map(path => ({ ...path, ...samplePath(path.points) }));
    this.visible = false;
    this.time = 0;
    this.lastTime = 0;
    this.lastDraw = 0;
    this.frame = null;
    this.tick = this.tick.bind(this);
    new ResizeObserver(() => this.resize()).observe(element);
    new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      this.sync();
    }, { threshold: 0 }).observe(element);
    motion.subscribe(() => this.sync());
    document.addEventListener('visibilitychange', () => this.sync());
    this.resize();
    this.sync();
  }

  resize() {
    const width = this.element.clientWidth;
    const density = Math.min(devicePixelRatio || 1, this.config.light?.density ?? 1.5);
    this.canvas.width = Math.round(width * density);
    this.canvas.height = this.canvas.width;
    this.ctx.setTransform(this.canvas.width / ART_SIZE, 0, 0, this.canvas.height / ART_SIZE, 0, 0);
    this.draw();
  }

  sync() {
    const active = this.visible && !document.hidden && !motion.reduced;
    this.element.classList.toggle('is-animating', active);
    this.element.dataset.motion = motion.reduced ? 'still' : active ? 'active' : 'idle';
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastTime = 0;
    this.lastDraw = 0;
    this.draw();
    if (active) this.frame = requestAnimationFrame(this.tick);
  }

  glow(x, y, radius, opacity, color = CYAN) {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color},${opacity})`);
    gradient.addColorStop(.18, `rgba(${color},${opacity * .52})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  draw() {
    const ctx = this.ctx;
    const time = motion.reduced ? 0 : this.time;
    const light = this.config.light;
    ctx.clearRect(0, 0, ART_SIZE, ART_SIZE);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    this.config.nodes.forEach(([x, y], index) => {
      const pulse = .35 + .25 * Math.sin(time * 1.5 - index * 1.7);
      this.glow(x, y, index ? (light?.nodeRadius ?? 31) : (light?.junctionRadius ?? 57), pulse * (light?.nodeOpacity ?? 1));
    });
    if (!motion.reduced) {
      for (const path of this.paths) {
        const head = (time / path.speed + path.delay) % 1;
        // Bright head with a short, fading tail; the underlying art stays intact.
        for (let segment = 0; segment < 20; segment++) {
          const progress = head - segment * .004;
          if (progress < 0) break;
          const a = atDistance(path, progress);
          const b = atDistance(path, Math.max(0, progress - .004));
          const alpha = .85 * (1 - segment / 20) ** 1.5;
          ctx.strokeStyle = `rgba(${path.color},${alpha})`;
          ctx.lineWidth = light?.trailWidth ?? 3.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        const tip = atDistance(path, head);
        this.glow(tip.x, tip.y, light?.tipGlowRadius ?? 24, light?.tipGlowOpacity ?? .72, path.color);
        ctx.fillStyle = '#effaff';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, light?.tipRadius ?? 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const cloud = this.config.dust;
    for (let i = 0; i < 28; i++) {
      const angle = i * 2.39996;
      const distance = Math.sqrt((i + .5) / 28);
      const x = cloud.x + Math.cos(angle) * distance * cloud.rx;
      const y = cloud.y + Math.sin(angle) * distance * cloud.ry + Math.sin(time * .4 + i) * 5;
      const shimmer = .1 + .6 * ((Math.sin(time * 1.2 + i * .8) + 1) / 2) ** 5;
      this.glow(x, y, 8, shimmer);
    }
  }

  tick(now) {
    if (this.lastTime) this.time += Math.min(now - this.lastTime, 64) / 1000;
    this.lastTime = now;
    // Thirty paints per second keeps the ambient effect light on mobile.
    if (now - this.lastDraw >= 1000 / 30) {
      this.draw();
      this.lastDraw = now;
    }
    this.frame = requestAnimationFrame(this.tick);
  }
}

document.querySelectorAll('.story-art').forEach(element => new SectionLight(element));
