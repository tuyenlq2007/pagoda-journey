import * as THREE from 'three';

// Procedural canvas textures, colours sampled from the interior renders (p1–p5)
// and the drone shots (DJI_*).

function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

const rand = (a, b) => a + Math.random() * (b - a);

// ---------- Interior ----------

// Ceiling mandala (p1–p5: red field, green frame, concentric coloured rings)
export function mandalaTexture() {
  return canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#1f6b45'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8b04a'; g.fillRect(28, 28, w - 56, h - 56);
    g.fillStyle = '#d42a1c'; g.fillRect(40, 40, w - 80, h - 80);
    const cx = w / 2, cy = h / 2;
    // outer square "palace" with gates
    const s = h * 0.62;
    g.save(); g.translate(cx, cy);
    const sq = (size, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.strokeRect(-size / 2, -size / 2, size, size); };
    g.fillStyle = '#f2e6c8'; g.fillRect(-s / 2, -s / 2, s, s);
    const quad = ['#2f7fd0', '#f0c419', '#d42a1c', '#2fae64'];
    // four triangles (directional colours)
    for (let i = 0; i < 4; i++) {
      g.save(); g.rotate((i * Math.PI) / 2);
      g.fillStyle = quad[i];
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-s / 2 + 12, -s / 2 + 12); g.lineTo(s / 2 - 12, -s / 2 + 12); g.closePath(); g.fill();
      // gate
      g.fillStyle = '#f2e6c8'; g.fillRect(-s * 0.12, -s / 2 - 22, s * 0.24, 26);
      g.fillStyle = quad[(i + 2) % 4]; g.fillRect(-s * 0.08, -s / 2 - 14, s * 0.16, 12);
      g.restore();
    }
    sq(s, '#1f6b45', 6); sq(s - 24, '#f0c419', 4);
    // rings
    const rings = [
      [s * 0.42, '#f6f0dc'], [s * 0.39, '#2fae64'], [s * 0.355, '#f0c419'],
      [s * 0.32, '#d42a1c'], [s * 0.27, '#f6f0dc'], [s * 0.2, '#2f7fd0'], [s * 0.13, '#f0c419'], [s * 0.08, '#d42a1c'],
    ];
    for (const [r, c] of rings) { g.fillStyle = c; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }
    // lotus petals
    for (let i = 0; i < 16; i++) {
      g.save(); g.rotate((i / 16) * Math.PI * 2);
      g.fillStyle = i % 2 ? '#ff8a3c' : '#ffd86b';
      g.beginPath(); g.ellipse(0, -s * 0.235, s * 0.03, s * 0.06, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate((i / 8) * Math.PI * 2 + 0.2);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(0, -s * 0.1, s * 0.015, s * 0.035, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.fillStyle = '#1b3f8f'; g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(s * 0.045, s * 0.03); g.lineTo(-s * 0.045, s * 0.03); g.fill();
    g.restore();
    // corner emblems
    for (const [x, y] of [[110, 110], [w - 110, 110], [110, h - 110], [w - 110, h - 110]]) {
      g.fillStyle = '#f6f0dc'; g.beginPath(); g.arc(x, y, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d42a1c'; g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.fill();
    }
  });
}

// Frieze band under the cornice: maroon field with gold medallions (p5)
export function friezeTexture() {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#3a0d0d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c99a3c'; g.fillRect(0, 6, w, 4); g.fillRect(0, h - 10, w, 4);
    for (let i = 0; i < 4; i++) {
      const x = i * 128 + 64, y = h / 2;
      g.fillStyle = '#e2b24a'; g.fillRect(x - 46, y - 46, 92, 92);
      g.fillStyle = '#5a1712'; g.fillRect(x - 40, y - 40, 80, 80);
      const rr = [[36, '#e8c060'], [30, '#b4281c'], [24, '#e8c060'], [17, '#7a2a14'], [10, '#f2d27a']];
      for (const [r, c] of rr) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        g.fillStyle = '#5a1712'; g.beginPath(); g.arc(x + Math.cos(a) * 27, y + Math.sin(a) * 27, 3, 0, Math.PI * 2); g.fill();
      }
    }
  }, { repeat: [12, 1] });
}

// Herringbone wood floor (center of the hall)
export function herringboneTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#7b5a3c'; g.fillRect(0, 0, w, h);
    const pw = 32, pl = 128;
    for (let y = -pl; y < h + pl; y += pw) {
      for (let x = -pl; x < w + pl; x += pw * 2) {
        for (const dir of [1, -1]) {
          g.save();
          g.translate(x + (dir < 0 ? pw : 0), y + (dir < 0 ? 0 : 0));
          g.rotate(dir * Math.PI / 4);
          const l = 52 + Math.random() * 30;
          g.fillStyle = `hsl(${rand(24, 32)}, ${rand(35, 45)}%, ${l * 0.6}%)`;
          g.fillRect(0, 0, pl * 0.7, pw * 0.7);
          g.strokeStyle = 'rgba(40,25,10,0.5)'; g.lineWidth = 1.5; g.strokeRect(0, 0, pl * 0.7, pw * 0.7);
          g.restore();
        }
      }
    }
    // grain
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(30,15,5,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, rand(4, 18), 1); }
  }, { repeat: [3, 7] });
}

// Beige speckled marble (floor border)
export function marbleTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#c9a77c'); gr.addColorStop(0.5, '#b38d62'); gr.addColorStop(1, '#cfae84');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,60,35' : '240,220,190'},${Math.random() * 0.35})`;
      const r = Math.random() * 2.2; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 6.3); g.fill();
    }
    g.strokeStyle = 'rgba(80,50,30,0.35)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
  }, { repeat: [10, 14] });
}

// Wood grain for tables / cabinets
export function woodTexture(base = '#6b4a2f') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '30,18,8' : '150,110,70'},${rand(0.05, 0.18)})`;
      g.lineWidth = rand(0.5, 2.5);
      const y = Math.random() * h;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.04 + i) * rand(1, 4));
      g.stroke();
    }
  });
}

// Wall: orange plaster
export function plasterTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e8902e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,50,0' : '255,200,120'},${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, { repeat: [8, 2] });
}

// Meditation cushion top: maroon with saffron inset (p1, p4)
export function cushionTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6e0f17'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8a93a'; g.fillRect(40, 54, w - 80, h - 120);
    g.fillStyle = '#6e0f17'; g.beginPath(); g.arc(w / 2, h - 66, 46, Math.PI, 0); g.fill();
  });
}

// Warm niche glow (arched niches of the altar cabinet)
export function nicheGlowTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, 20, 4, w / 2, h * 0.5, h * 0.75);
    gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.35, '#e7a85a'); gr.addColorStop(1, '#5a3218');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

// Sheer curtain glow for windows
export function curtainTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#fff2c8'); gr.addColorStop(1, '#f2b866');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = `rgba(180,110,40,${0.12 + 0.1 * Math.sin(x * 0.4)})`; g.fillRect(x, 0, 3, h); }
  });
}

// Soft round sprite for dust / glow
export function softDot() {
  return canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.4, 'rgba(255,210,140,0.45)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: true });
}

// ---------- Exterior ----------

export function asphaltTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5d6064'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,20,20' : '160,160,160'},${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  }, { repeat: [40, 2] });
}

export function grassTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4f7a35'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `hsla(${rand(70, 110)},${rand(30, 55)}%,${rand(20, 45)}%,0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 1, rand(2, 5)); }
  }, { repeat: [60, 60] });
}

// Green ventilation-block facade of the neighbour (DJI_0084 / DJI_0093)
export function breezeBlockTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1f5a2e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3fae5a';
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      g.beginPath(); g.arc(x + 16, y + 16, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#123d1e'; g.beginPath(); g.arc(x + 16, y + 16, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3fae5a';
    }
  }, { repeat: [2, 4] });
}

// Generic townhouse facade: white wall with window grid; emissive variant for lit windows
export function facadeTexture(seed = 0, lit = false) {
  return canvasTex(256, 512, (g, w, h) => {
    const tones = ['#e9e6df', '#dcd6c8', '#ece9e2', '#d2d0cb', '#e6dcc4'];
    g.fillStyle = lit ? '#000' : tones[seed % tones.length]; g.fillRect(0, 0, w, h);
    const floors = 5;
    for (let f = 0; f < floors; f++) {
      const y = h - (f + 1) * (h / floors) + 24;
      const cols = 2 + (seed + f) % 2;
      for (let c = 0; c < cols; c++) {
        const ww = (w - 40) / cols - 18;
        const x = 20 + c * ((w - 40) / cols) + 9;
        const on = Math.random() < 0.35;
        if (lit) {
          g.fillStyle = on ? `hsl(${rand(32, 42)},90%,${rand(55, 70)}%)` : '#000';
        } else {
          g.fillStyle = '#2a2f36';
        }
        g.fillRect(x, y, ww, h / floors - 50);
        if (!lit) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, y, ww, 6); }
      }
      if (!lit) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y + h / floors - 26, w, 3); }
    }
  });
}

// Pergola slats (brown, from the roof of DJI_0087)
export function slatTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7a4a34'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = '#4a2a1c'; g.fillRect(x, 0, 4, h); }
  }, { repeat: [6, 1] });
}

// Sky gradient (drone shots were taken at dusk: pale sky, warm horizon)
export function skyTexture() {
  return canvasTex(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5d6f93');
    gr.addColorStop(0.35, '#a8aec0');
    gr.addColorStop(0.47, '#f1cfae');
    gr.addColorStop(0.5, '#f6c693');
    gr.addColorStop(0.56, '#b9a493');
    gr.addColorStop(1, '#6a6660');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { repeat: [1, 1] });
}
