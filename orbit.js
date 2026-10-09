/* Read geometry only on resize; pointer input and rotation share one animation frame. */
export class Orbit {
  constructor(stage, items, { onMotionChange = () => {}, onForegroundChange = () => {} } = {}) {
    this.stage = stage;
    this.items = [...items];
    this.onMotionChange = onMotionChange;
    this.onForegroundChange = onForegroundChange;
    this.angle = -0.46;
    this.pendingAngle = 0;
    this.previousTime = 0;
    this.motion = window.SiteMotion;
    this.paused = this.motion.reduced;
    this.suspended = false;
    this.pointer = null;
    this.didDrag = false;
    this.frame = null;
    this.dirty = true;
    this.foregroundKey = '';
    this.compact = matchMedia('(max-width: 760px), (pointer: coarse)');
    this.compact.addEventListener('change', () => this.measure());
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(stage);
    this.motion.subscribe(value => this.setPaused(value));
    // Capture receives input from the entire card, not only the empty stage.
    stage.addEventListener('pointerdown', event => this.startDrag(event), { capture: true });
    stage.addEventListener('pointermove', event => this.drag(event), { capture: true });
    stage.addEventListener('pointerup', event => this.endDrag(event));
    stage.addEventListener('pointercancel', event => this.endDrag(event));
    stage.addEventListener('lostpointercapture', event => this.endDrag(event));
    stage.addEventListener('dragstart', event => event.preventDefault());
    document.addEventListener('visibilitychange', () => {
      this.previousTime = 0;
      if (document.hidden) {
        this.endDrag();
        this.cancelFrame();
      } else this.requestFrame();
    });
    this.measure();
    this.onMotionChange(this.paused);
  }

  requestFrame() {
    if (this.frame === null && !document.hidden && !this.suspended) {
      this.frame = requestAnimationFrame(time => this.tick(time));
    }
  }

  cancelFrame() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  setPaused(value) {
    this.paused = value;
    this.previousTime = 0;
    if (value) this.cancelFrame();
    this.onMotionChange(value);
    if (!value || this.dirty || this.pendingAngle) this.requestFrame();
  }

  setSuspended(value) {
    this.suspended = value;
    this.previousTime = 0;
    if (value) {
      this.endDrag();
      this.cancelFrame();
    } else this.requestFrame();
  }

  startDrag(event) {
    if (event.button !== 0 || event.isPrimary === false || this.pointer || this.suspended ||
        event.target.closest('[data-no-drag]')) return;
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX };
    // Keep the previous drag's click suppressed until a new intentional gesture.
    this.didDrag = false;
  }

  drag(event) {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    const dx = event.clientX - this.pointer.x;
    const dy = event.clientY - this.pointer.y;
    if (!this.didDrag) {
      if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
        this.pointer = null; // Native vertical page scrolling remains available.
        return;
      }
      if (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      this.didDrag = true;
      this.stage.setPointerCapture(event.pointerId);
      this.stage.classList.add('is-dragging');
    }
    if (event.cancelable) event.preventDefault();
    this.pendingAngle += (event.clientX - this.pointer.lastX) / this.dragScale;
    this.pointer.lastX = event.clientX;
    this.requestFrame();
  }

  endDrag(event) {
    if (event && this.pointer && event.pointerId !== this.pointer.id) return;
    const id = this.pointer?.id;
    this.pointer = null;
    this.stage.classList.remove('is-dragging');
    if (id !== undefined && this.stage.hasPointerCapture(id)) this.stage.releasePointerCapture(id);
    // Do not clear didDrag here: delayed touch clicks must not open the dialog.
  }

  measure() {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    const mobile = width < 700;
    const widths = this.items.map(item => item.offsetWidth);
    this.dragScale = Math.max(width * 0.22, 1);
    this.metrics = this.items.map((item, index) => {
      const band = index % 2;
      const edgeSafe = Math.max(0, width / 2 - widths[index] * (mobile ? 0.8 : 0.96) / 2 - 12);
      return {
        band,
        phase: Math.floor(index / 2) * Math.PI * 2 / Math.ceil(this.items.length / 2) + (band ? 0.62 : 0),
        radiusX: Math.min(width * (mobile ? (band ? 0.38 : 0.32) : (band ? 0.4 : 0.33)), band ? 565 : 475, edgeSafe),
        radiusY: height * (mobile ? 0.115 : 0.15),
        centerY: height * (band ? 0.71 : 0.28),
        height,
        scale: mobile ? 0.69 : 0.85
      };
    });
    this.dirty = true;
    this.requestFrame();
  }

  paint() {
    const depths = [];
    this.items.forEach((item, index) => {
      const m = this.metrics[index];
      const theta = this.angle + m.phase;
      const sine = Math.sin(theta);
      const depth = Math.cos(theta);
      depths.push({ index, depth, band: m.band });
      const x = sine * m.radiusX;
      const y = m.centerY + depth * m.radiusY - sine * m.height * 0.025;
      item.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) perspective(1100px) rotateY(${-sine * 17}deg) rotateZ(${-sine * 2.2}deg) scale(${m.scale + depth * 0.10})`;
      const z = String(Math.round(25 + depth * 15));
      if (item.style.zIndex !== z) item.style.zIndex = z;
      item.style.opacity = String(0.78 + depth * 0.22);
      item.classList.toggle('is-in-front', depth > 0.05);
    });
    // All ten cards remain visible. Small/touch screens decode only the four front previews.
    const foreground = this.compact.matches ? [0, 1].flatMap(band =>
      depths.filter(item => item.band === band).sort((a, b) => b.depth - a.depth)
        .slice(0, 2).map(item => item.index)
    ).sort((a, b) => a - b) : null;
    const key = foreground ? foreground.join(',') : 'all';
    if (key !== this.foregroundKey) {
      this.foregroundKey = key;
      this.onForegroundChange(foreground);
    }
    this.dirty = false;
  }

  tick(time) {
    this.frame = null;
    if (document.hidden || this.suspended) return;
    const delta = this.previousTime ? Math.min((time - this.previousTime) / 1000, 0.05) : 0;
    this.previousTime = time;
    // Holding, hovering, or dragging never pauses automatic rotation.
    if (!this.paused) this.angle += delta * Math.PI * 2 / 100;
    const moved = this.pendingAngle !== 0;
    this.angle = (this.angle + this.pendingAngle) % (Math.PI * 2);
    this.pendingAngle = 0;
    if (!this.paused || this.dirty || moved) this.paint();
    if (!this.paused) this.requestFrame();
  }
}
