/**
 * ============================================
 * Realistic Rain — Canvas Particle System
 * Retro-Cyberpunk Homepage
 * ============================================
 */

;(function () {
  const canvas = document.getElementById('rain-canvas');
  const ctx = canvas.getContext('2d');

  /* ---- Configuration ---- */
  const MAX_DROPS = 500;           // max concurrent raindrops
  const SPLASH_POOL_LIMIT = 80;   // max splashes on screen
  const WIND_DRIFT = -0.6;         // horizontal drift (negative = slight leftward slant)

  /* ---- State ---- */
  let width, height;
  let drops = [];
  let splashes = [];
  let animationId;

  /* =========================================
     Raindrop Class
     ========================================= */
  class Raindrop {
    constructor(reset = true) {
      this.reset(reset);
    }

    reset(randomY = true) {
      // Layer index determines depth: 0=near (fast, thick, bright), 1=mid, 2=far (slow, thin, dim)
      this.layer = Math.floor(Math.random() * 3);

      // Position
      this.x = Math.random() * width;
      this.y = randomY ? Math.random() * -height : -Math.random() * 80;

      // Physical properties vary by depth layer
      switch (this.layer) {
        case 0: // Near — foreground
          this.length = 14 + Math.random() * 18;
          this.speed = 14 + Math.random() * 10;
          this.thickness = 1.4 + Math.random() * 0.9;
          this.opacity = 0.55 + Math.random() * 0.35;
          this.blur = 0;
          break;
        case 1: // Mid
          this.length = 10 + Math.random() * 14;
          this.speed = 9 + Math.random() * 8;
          this.thickness = 0.7 + Math.random() * 0.6;
          this.opacity = 0.3 + Math.random() * 0.35;
          this.blur = 0.5 + Math.random() * 0.8;
          break;
        case 2: // Far — background
          this.length = 6 + Math.random() * 10;
          this.speed = 5 + Math.random() * 7;
          this.thickness = 0.3 + Math.random() * 0.4;
          this.opacity = 0.12 + Math.random() * 0.22;
          this.blur = 1.0 + Math.random() * 1.2;
          break;
      }

      // Tilt angle (consistent per drop, slight variation)
      this.angle = -0.12 + (Math.random() - 0.5) * 0.08; // ~ -7° tilt, ± ~2.3°
    }

    update() {
      // Apply gravity + wind drift
      const drift = WIND_DRIFT * (1 - this.layer * 0.25); // far layers drift less
      this.y += this.speed;
      this.x += drift;

      // Check if drop exits screen
      if (this.y > height + 20) {
        // Spawn splash at bottom
        if (splashes.length < SPLASH_POOL_LIMIT && this.layer < 2) {
          splashes.push(new Splash(this.x, height, this.layer));
        }
        this.reset(false);
      }

      // Wrap horizontally
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
    }

    draw(ctx) {
      const { x, y, length, thickness, opacity, angle, blur } = this;

      ctx.save();

      // Apply blur via shadow (perf-friendly approximation)
      if (blur > 0.05) {
        ctx.shadowColor = 'rgba(180,210,240,0.3)';
        ctx.shadowBlur = blur;
      }

      // Color: cool blue-white with slight purple tint
      const r = 200;
      const g = 215;
      const b = 240;
      ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';

      // Draw the raindrop as a short angled line
      const dx = Math.sin(angle) * length;
      const dy = Math.cos(angle) * length;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();

      // Subtle head glow for near-layer drops
      if (this.layer === 0) {
        ctx.fillStyle = `rgba(220,235,255,${opacity * 0.7})`;
        ctx.beginPath();
        ctx.arc(x, y, thickness * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /* =========================================
     Splash Class — ground impact ripples
     ========================================= */
  class Splash {
    constructor(x, groundY, layer) {
      this.x = x;
      this.y = groundY;
      this.layer = layer;
      this.life = 0.6 + Math.random() * 0.5; // seconds
      this.age = 0;
      this.maxRadius = 3 + Math.random() * 7;
      this.opacity = 0.45 + Math.random() * 0.4;
    }

    update(dt) {
      this.age += dt;
      return this.age < this.life;
    }

    draw(ctx) {
      const progress = this.age / this.life;
      const radius = this.maxRadius * progress;
      const alpha = this.opacity * (1 - progress);

      ctx.save();
      ctx.strokeStyle = `rgba(190,215,235,${alpha})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      // Secondary inner ripple
      if (progress < 0.7) {
        const innerR = radius * 0.45;
        const innerAlpha = alpha * 0.5;
        ctx.strokeStyle = `rgba(200,225,245,${innerAlpha})`;
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.arc(this.x, this.y, innerR, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /* =========================================
     Resize Handler
     ========================================= */
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Re-seed drops to fill new dimensions
    drops = [];
    for (let i = 0; i < MAX_DROPS; i++) {
      drops.push(new Raindrop(true));
    }
    splashes = [];
  }

  /* =========================================
     Animation Loop
     ========================================= */
  let lastTime = performance.now();

  function tick(now) {
    // Delta time cap to avoid spiral of death on tab-away
    let dt = (now - lastTime) / 1000;
    if (dt > 0.12) dt = 0.12; // cap at ~8fps effective
    lastTime = now;

    // Clear with deep night color
    ctx.clearRect(0, 0, width, height);

    // Subtle ambient fog layer
    ctx.fillStyle = 'rgba(8,8,16,0.18)';
    ctx.fillRect(0, 0, width, height);

    // Update & draw raindrops
    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i];
      drop.update();
      drop.draw(ctx);
    }

    // Update & draw splashes
    for (let i = splashes.length - 1; i >= 0; i--) {
      const alive = splashes[i].update(dt);
      if (!alive) {
        splashes.splice(i, 1);
        continue;
      }
      splashes[i].draw(ctx);
    }

    // Ensure we always have enough drops (in case of resize clearing them)
    while (drops.length < MAX_DROPS) {
      drops.push(new Raindrop(true));
    }

    animationId = requestAnimationFrame(tick);
  }

  /* =========================================
     Init
     ========================================= */
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Kick off animation
  lastTime = performance.now();
  animationId = requestAnimationFrame(tick);

  // Cleanup on page unload (optional but good practice)
  window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
  });
})();