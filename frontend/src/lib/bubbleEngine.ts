/**
 * Restrained Bubble Engine — data-driven liquid cooling simulation background.
 *
 * - Overview page: prominent depth and physics (behind text, pointer-events none).
 * - Other pages: subdued (~15% opacity, ~25% density) behind solid panels.
 * - Pauses on hidden tabs, throttles on mobile, respects prefers-reduced-motion.
 */

interface Bubble {
  x: number;
  y: number;
  radius: number;
  depth: number;
  speedY: number;
  speedX: number;
  wobblePhase: number;
  wobbleAmp: number;
  wobbleFreq: number;
  opacity: number;
  tint: 'ice' | 'coral';
  active: boolean;
  life: number;
  maxLife: number;
  specularAngle: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  active: boolean;
}

const COLORS = {
  ice: { r: 127, g: 184, b: 255 },
  foam: { r: 187, g: 217, b: 255 },
  coral: { r: 255, g: 107, b: 74 },
  sand: { r: 230, g: 184, b: 106 },
};

export class BubbleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bubbles: Bubble[] = [];
  private ripples: Ripple[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private mouseX = -1000;
  private mouseY = -1000;
  private scrollSpeed = 0;
  private lastScrollY = 0;
  private animId = 0;
  private paused = false;
  private reducedMotion = false;
  private maxBubbles = 140;
  private targetBubbles = 90;
  private coolingIntensity = 0.5;
  private lastTime = 0;
  private pageMode: 'overview' | 'subdued' = 'overview';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducedMotion) return;

    const isMobile = window.innerWidth < 768;
    this.maxBubbles = isMobile ? 40 : 140;
    this.targetBubbles = isMobile ? 25 : 90;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resize();
    this.init();
    this.bindEvents();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  setPageMode(mode: 'overview' | 'subdued') {
    this.pageMode = mode;
    const isMobile = window.innerWidth < 768;
    if (mode === 'subdued') {
      this.targetBubbles = isMobile ? 12 : 30;
      this.canvas.style.opacity = '0.18';
    } else {
      this.targetBubbles = isMobile ? 35 : 90;
      this.canvas.style.opacity = '1.0';
    }
  }

  private createBubble(x?: number, y?: number, burst = false): Bubble {
    const depth = Math.random();
    const baseRadius = 2 + Math.random() * 8;
    const radius = baseRadius * (0.5 + depth * 0.5);
    return {
      x: x ?? Math.random() * this.width,
      y: y ?? this.height + radius + Math.random() * 60,
      radius,
      depth,
      speedY: -(0.18 + Math.random() * 0.45) * (0.6 + this.coolingIntensity * 0.7),
      speedX: (Math.random() - 0.5) * 0.15,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: 0.2 + Math.random() * 0.9,
      wobbleFreq: 0.6 + Math.random() * 1.2,
      opacity: 0.12 + depth * 0.35,
      tint: Math.random() > 0.88 ? 'coral' : 'ice',
      active: true,
      life: 0,
      maxLife: burst ? 70 + Math.random() * 50 : 350 + Math.random() * 450,
      specularAngle: Math.random() * Math.PI * 2,
    };
  }

  private init() {
    for (let i = 0; i < this.targetBubbles; i++) {
      const b = this.createBubble(undefined, Math.random() * this.height);
      b.life = Math.random() * b.maxLife * 0.8;
      this.bubbles.push(b);
    }
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.resize(), { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }, { passive: true });

    window.addEventListener('click', (e) => {
      if (this.pageMode === 'overview') {
        this.burst(e.clientX, e.clientY, 10);
      }
    });

    window.addEventListener('scroll', () => {
      const delta = Math.abs(window.scrollY - this.lastScrollY);
      this.scrollSpeed = Math.min(delta / 12, 2.5);
      this.lastScrollY = window.scrollY;
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (!this.paused) {
        this.lastTime = performance.now();
        this.loop(this.lastTime);
      }
    });

    // Easter egg: 'B' key burst
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'b' || e.key === 'B') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        for (let i = 0; i < 4; i++) {
          this.burst(Math.random() * this.width, Math.random() * this.height, 8);
        }
      }
    });
  }

  burst(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.2 + Math.random() * 2.2;
      const b = this.createBubble(x, y, true);
      b.speedX = Math.cos(angle) * speed;
      b.speedY = Math.sin(angle) * speed - 0.4;
      b.radius = 2.5 + Math.random() * 5;
      b.maxLife = 50 + Math.random() * 40;
      if (this.bubbles.length < this.maxBubbles) {
        this.bubbles.push(b);
      }
    }
    this.ripples.push({
      x, y, radius: 0, maxRadius: 65 + Math.random() * 30, opacity: 0.4, active: true,
    });
  }

  setCoolingIntensity(v: number) {
    this.coolingIntensity = Math.max(0, Math.min(1, v));
  }

  private loop = (now: number) => {
    if (this.paused || this.reducedMotion) return;
    const dt = Math.min((now - this.lastTime) / 16.67, 2.5);
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.width, this.height);

    const activeCount = this.bubbles.filter(b => b.active).length;
    if (activeCount < this.targetBubbles) {
      const toSpawn = Math.min(2, this.targetBubbles - activeCount);
      for (let i = 0; i < toSpawn; i++) {
        this.bubbles.push(this.createBubble());
      }
    }

    const scrollAccel = 1 + this.scrollSpeed * 0.25;
    this.scrollSpeed *= 0.94;

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (!b.active) continue;

      b.life += dt;
      if (b.life > b.maxLife || b.y < -b.radius * 2) {
        b.active = false;
        this.bubbles.splice(i, 1);
        continue;
      }

      b.wobblePhase += b.wobbleFreq * 0.02 * dt;
      b.x += (b.speedX + Math.sin(b.wobblePhase) * b.wobbleAmp * 0.08) * dt;
      b.y += b.speedY * scrollAccel * dt;

      // Cursor repulsion (only active on overview page)
      if (this.pageMode === 'overview') {
        const dx = b.x - this.mouseX;
        const dy = b.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repulseRadius = 90;
        if (dist < repulseRadius && dist > 0) {
          const force = (1 - dist / repulseRadius) * 1.8;
          b.x += (dx / dist) * force * dt;
          b.y += (dy / dist) * force * dt;
        }
      }

      const fadeIn = Math.min(b.life / 25, 1);
      const fadeOut = Math.max(1 - (b.life - b.maxLife + 25) / 25, 0);
      const alpha = b.opacity * fadeIn * fadeOut;

      this.drawBubble(b, alpha);
    }

    // Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (!r.active) { this.ripples.splice(i, 1); continue; }
      r.radius += 1.8 * dt;
      r.opacity -= 0.015 * dt;
      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        r.active = false;
        continue;
      }
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(127, 184, 255, ${r.opacity * 0.6})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  private drawBubble(b: Bubble, alpha: number) {
    const ctx = this.ctx;
    const color = b.tint === 'coral' ? COLORS.coral : COLORS.ice;
    const rimColor = COLORS.foam;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rimColor.r}, ${rimColor.g}, ${rimColor.b}, ${0.35 * alpha})`;
    ctx.lineWidth = 0.75;
    ctx.stroke();

    const grad = ctx.createRadialGradient(
      b.x - b.radius * 0.3, b.y - b.radius * 0.3, 0,
      b.x, b.y, b.radius
    );
    grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.12 * alpha})`);
    grad.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.05 * alpha})`);
    grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fill();

    if (b.radius > 3.5) {
      const hx = b.x + Math.cos(b.specularAngle) * b.radius * 0.35;
      const hy = b.y + Math.sin(b.specularAngle) * b.radius * 0.35;
      ctx.beginPath();
      ctx.arc(hx, hy, b.radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * alpha})`;
      ctx.fill();
    }

    ctx.restore();
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    this.paused = true;
  }
}
