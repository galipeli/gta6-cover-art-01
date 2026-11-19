/* Neon Coast Cover Studio — cover renderer.
 * Draws a Vice City-style multi-panel poster cover on a 2D canvas:
 * sunset sky, retro sun, skyline + palm silhouettes, photo panels with
 * per-panel crop, gradient-map grades, halftone title block, Anton title
 * with Pacifico neon subtitle, heat-meter stars, badge ribbon, grain and
 * vignette. No network, no Rockstar art: every shape is drawn in code. */
(function (global) {
  'use strict';

  /* ---------- seeded random (deterministic grain) ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- layouts: panels + title zone, normalized 0..1 ---------- */
  var COVER_LAYOUTS = [
    {
      id: 'nine', name: '9-Panel Grid',
      panels: [
        { x: 0.03, y: 0.03, w: 0.303, h: 0.235 }, { x: 0.348, y: 0.03, w: 0.303, h: 0.235 },
        { x: 0.667, y: 0.03, w: 0.303, h: 0.235 },
        { x: 0.03, y: 0.28, w: 0.303, h: 0.235 }, { x: 0.348, y: 0.28, w: 0.303, h: 0.235 },
        { x: 0.667, y: 0.28, w: 0.303, h: 0.235 },
        { x: 0.03, y: 0.53, w: 0.303, h: 0.235 }, { x: 0.348, y: 0.53, w: 0.303, h: 0.235 },
        { x: 0.667, y: 0.53, w: 0.303, h: 0.235 }
      ],
      title: { x: 0.03, y: 0.79, w: 0.94, h: 0.18, align: 'center' }
    },
    {
      id: 'hero-three', name: 'Hero + Three',
      panels: [
        { x: 0.03, y: 0.03, w: 0.94, h: 0.46 },
        { x: 0.03, y: 0.51, w: 0.303, h: 0.24 }, { x: 0.348, y: 0.51, w: 0.303, h: 0.24 },
        { x: 0.667, y: 0.51, w: 0.303, h: 0.24 }
      ],
      title: { x: 0.03, y: 0.78, w: 0.94, h: 0.19, align: 'center' }
    },
    {
      id: 'full-bleed', name: 'Full-Bleed Hero',
      panels: [{ x: 0.0, y: 0.0, w: 1.0, h: 1.0 }],
      title: { x: 0.04, y: 0.72, w: 0.92, h: 0.24, align: 'left', scrim: true }
    },
    {
      id: 'tilted', name: 'Tilted Snapshot',
      panels: [
        { x: 0.06, y: 0.20, w: 0.42, h: 0.50, rot: -7 },
        { x: 0.50, y: 0.25, w: 0.42, h: 0.50, rot: 6 },
        { x: 0.28, y: 0.53, w: 0.44, h: 0.42, rot: -2 }
      ],
      title: { x: 0.04, y: 0.01, w: 0.92, h: 0.14, align: 'left' },
      skyline: false
    },
    {
      id: 'story', name: 'Story Stack',
      panels: [
        { x: 0.04, y: 0.03, w: 0.92, h: 0.38 },
        { x: 0.04, y: 0.43, w: 0.45, h: 0.26 }, { x: 0.51, y: 0.43, w: 0.45, h: 0.26 },
        { x: 0.04, y: 0.71, w: 0.92, h: 0.13 }
      ],
      title: { x: 0.04, y: 0.86, w: 0.92, h: 0.11, align: 'center' }
    },
    {
      id: 'quad', name: 'Quad + Strip',
      panels: [
        { x: 0.03, y: 0.03, w: 0.465, h: 0.34 }, { x: 0.505, y: 0.03, w: 0.465, h: 0.34 },
        { x: 0.03, y: 0.385, w: 0.465, h: 0.34 }, { x: 0.505, y: 0.385, w: 0.465, h: 0.34 },
        { x: 0.03, y: 0.74, w: 0.94, h: 0.10 }
      ],
      title: { x: 0.03, y: 0.86, w: 0.94, h: 0.11, align: 'center' }
    }
  ];

  /* ---------- grades: sky palette + photo wash ---------- */
  var COVER_GRADES = [
    { id: 'sunset', name: 'Sunset', sky: ['#2b0a4e', '#c2277f', '#ff7a3d', '#ffc46b'],
      sun: '#ffd76b', wash: '#ff7a3d', washAlpha: 0.20, blend: 'overlay', ink: '#1a0533' },
    { id: 'neon', name: 'Neon Nights', sky: ['#0b0626', '#3b0f6e', '#ff2e88', '#2de2c5'],
      sun: '#ff5db1', wash: '#ff2e88', washAlpha: 0.24, blend: 'overlay', ink: '#0b0626' },
    { id: 'vice', name: 'Vice Pink', sky: ['#1d0533', '#7a1e8f', '#ff4fa3', '#ff9ecf'],
      sun: '#ffe3f1', wash: '#ff4fa3', washAlpha: 0.20, blend: 'soft-light', ink: '#1d0533' },
    { id: 'golden', name: 'Golden Hour', sky: ['#33150a', '#a34d12', '#ff9a3d', '#ffe9a8'],
      sun: '#fff3c4', wash: '#ffb347', washAlpha: 0.22, blend: 'overlay', ink: '#2a1206' },
    { id: 'midnight', name: 'Midnight', sky: ['#020617', '#101b4d', '#27408f', '#4f7de0'],
      sun: '#cfe4ff', wash: '#3b6fe0', washAlpha: 0.22, blend: 'overlay', ink: '#020617' },
    { id: 'candy', name: 'Candy Pop', sky: ['#3d0a5e', '#e0398f', '#ffb03d', '#7ef0d4'],
      sun: '#fff7ae', wash: '#ff8fd1', washAlpha: 0.18, blend: 'soft-light', ink: '#2c0847' }
  ];

  var EXPORT_SIZES = [
    { w: 1080, h: 1080, label: '1080x1080' },
    { w: 1080, h: 1350, label: '1080x1350' },
    { w: 1920, h: 1080, label: '1920x1080' }
  ];

  function layoutById(id) {
    for (var i = 0; i < COVER_LAYOUTS.length; i++) {
      if (COVER_LAYOUTS[i].id === id) return COVER_LAYOUTS[i];
    }
    return COVER_LAYOUTS[0];
  }
  function gradeById(id) {
    for (var i = 0; i < COVER_GRADES.length; i++) {
      if (COVER_GRADES[i].id === id) return COVER_GRADES[i];
    }
    return COVER_GRADES[0];
  }

  /* ---------- small drawing helpers ---------- */
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStar(ctx, cx, cy, r, filled, color) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + (i * Math.PI) / 5;
      var rad = i % 2 === 0 ? r : r * 0.45;
      var px = cx + Math.cos(ang) * rad;
      var py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) { ctx.fillStyle = color; ctx.fill(); }
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.strokeStyle = color; ctx.stroke();
  }

  function drawPalm(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(10, -55, 26, -95); ctx.stroke();
    ctx.lineWidth = 5;
    for (var i = 0; i < 7; i++) {
      var a = -Math.PI * (0.08 + i * 0.13);
      var bx = 26 + Math.cos(a) * 52;
      var by = -95 + Math.sin(a) * 30 - 6;
      ctx.beginPath(); ctx.moveTo(26, -95);
      ctx.quadraticCurveTo(26 + Math.cos(a) * 30, -95 + Math.sin(a) * 22, bx, by);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(26, -95, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawSkyline(ctx, W, H, horizonY, color) {
    ctx.fillStyle = color;
    var rnd = mulberry32(20261119);
    var x = 0;
    while (x < W) {
      var bw = W * (0.04 + rnd() * 0.07);
      var bh = H * (0.03 + rnd() * 0.09);
      ctx.fillRect(x, horizonY - bh, bw, bh);
      if (rnd() > 0.6) {
        ctx.fillRect(x + bw * 0.3, horizonY - bh - H * 0.025, bw * 0.12, H * 0.025);
      }
      x += bw + W * 0.008;
    }
  }

  var grainCanvas = null;
  function getGrain() {
    if (grainCanvas) return grainCanvas;
    var rnd = mulberry32(77);
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 160; grainCanvas.height = 160;
    var g = grainCanvas.getContext('2d');
    var img = g.createImageData(160, 160);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = 110 + Math.floor(rnd() * 90);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return grainCanvas;
  }

  function drawHalftone(ctx, x, y, w, h, color) {
    var step = Math.max(7, w / 46);
    ctx.fillStyle = color;
    for (var yy = y + step / 2; yy < y + h; yy += step) {
      for (var xx = x + step / 2; xx < x + w; xx += step) {
        var edge = Math.min((xx - x) / w, (x + w - xx) / w, (yy - y) / h, (y + h - yy) / h);
        var r = step * 0.32 * (0.35 + 0.65 * Math.min(1, edge * 3));
        ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  /* ---------- photo into panel rect, cover-fit with crop ---------- */
  function drawPhotoInto(ctx, img, rx, ry, rw, rh, crop, grade, strength) {
    if (!img || !img.naturalWidth) return false;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var zoom = (crop && crop.zoom ? crop.zoom : 100) / 100;
    var ox = (crop && crop.ox ? crop.ox : 0) / 100;
    var oy = (crop && crop.oy ? crop.oy : 0) / 100;
    var scale = Math.max(rw / iw, rh / ih) * zoom;
    var dw = iw * scale, dh = ih * scale;
    var dx = rx + (rw - dw) / 2 + ox * rw * 0.4;
    var dy = ry + (rh - dh) / 2 + oy * rh * 0.4;
    ctx.drawImage(img, dx, dy, dw, dh);
    /* gradient-map wash: warm bottom, cool top, then the grade tint */
    var grad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    grad.addColorStop(0, 'rgba(64,20,120,0)');
    grad.addColorStop(1, 'rgba(255,110,40,0.16)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.globalCompositeOperation = grade.blend;
    ctx.globalAlpha = grade.washAlpha * (strength / 70);
    ctx.fillStyle = grade.wash;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }

  function drawPanelFrame(ctx, rx, ry, rw, rh, rot, grade, W) {
    var border = Math.max(3, W * 0.006);
    ctx.save();
    if (rot) {
      ctx.translate(rx + rw / 2, ry + rh / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-rw / 2, -rh / 2);
      rx = 0; ry = 0;
    }
    roundRectPath(ctx, rx - border / 2, ry - border / 2, rw + border, rh + border, border * 2);
    ctx.lineWidth = border * 2.4;
    ctx.strokeStyle = grade.ink;
    ctx.stroke();
    roundRectPath(ctx, rx, ry, rw, rh, border * 1.6);
    ctx.lineWidth = border;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }

  /* poster-art banding: two short diagonal stripes in the panel's
   * top-right corner only — a corner accent, never a scratch across
   * the whole photo. */
  function drawBands(ctx, rx, ry, rw, rh, W) {
    var band = Math.max(5, W * 0.011);
    var len = rw * 0.52;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    ctx.translate(rx + rw * 0.86, ry + rh * 0.14);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-len / 2, -band * 1.6, len, band);
    ctx.fillStyle = '#111111';
    ctx.fillRect(-len / 2, -band * 0.2, len, band);
    ctx.fillStyle = '#ff9a3d';
    ctx.fillRect(-len / 2, band * 1.2, len, band * 0.7);
    ctx.restore();
  }

  /* ---------- main cover draw ---------- */
  function drawCover(ctx, W, H, state) {
    var grade = gradeById(state.grade);
    var layout = layoutById(state.layout);
    var strength = typeof state.gradeStrength === 'number' ? state.gradeStrength : 70;
    var scale = Math.min(W, H) / 1080;

    /* sky */
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, grade.sky[0]);
    sky.addColorStop(0.45, grade.sky[1]);
    sky.addColorStop(0.75, grade.sky[2]);
    sky.addColorStop(1, grade.sky[3]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    /* retro sun with slats */
    var sunR = Math.min(W, H) * 0.16;
    var sunX = W * 0.72, sunY = H * 0.30;
    ctx.save();
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.clip();
    var sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunGrad.addColorStop(0, grade.sun);
    sunGrad.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = sunGrad;
    ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
    ctx.fillStyle = grade.sky[1];
    for (var s = 0; s < 5; s++) {
      var sy = sunY + sunR * (0.05 + s * 0.18);
      ctx.fillRect(sunX - sunR, sy, sunR * 2, sunR * (0.02 + s * 0.012));
    }
    ctx.restore();

    /* skyline + palms behind panels */
    if (layout.skyline !== false) {
      drawSkyline(ctx, W, H, H * 0.62, grade.ink);
      drawPalm(ctx, W * 0.015, H * 0.66, scale * 1.1, grade.ink);
      drawPalm(ctx, W * 0.965, H * 0.60, scale * 0.9, grade.ink);
    }

    /* panels */
    var panels = layout.panels;
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var rx = p.x * W, ry = p.y * H, rw = p.w * W, rh = p.h * H;
      var slot = state.panels && state.panels[i] ? state.panels[i] : { photo: 0, zoom: 100, ox: 0, oy: 0 };
      var photo = state.photos && state.photos[slot.photo] ? state.photos[slot.photo] : null;
      ctx.save();
      if (p.rot) {
        ctx.translate(rx + rw / 2, ry + rh / 2);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.translate(-rw / 2, -rh / 2);
        rx = 0; ry = 0;
      }
      roundRectPath(ctx, rx, ry, rw, rh, Math.max(4, W * 0.008));
      ctx.clip();
      if (photo && photo.img) {
        drawPhotoInto(ctx, photo.img, rx, ry, rw, rh, slot, grade, strength);
      } else {
        var ph = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
        ph.addColorStop(0, '#3d1a63'); ph.addColorStop(1, '#12081f');
        ctx.fillStyle = ph; ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = Math.round(rh * 0.16) + 'px Anton, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('ADD PHOTO', rx + rw / 2, ry + rh / 2);
      }
      ctx.restore();
      if (i === panels.length - 1 && panels.length > 1 && !p.rot) {
        drawBands(ctx, p.x * W, p.y * H, rw, rh, W);
      }
      drawPanelFrame(ctx, p.x * W, p.y * H, rw, rh, p.rot, grade, W);
    }

    /* title block */
    var t = layout.title;
    var tx = t.x * W, ty = t.y * H, tw = t.w * W, th = t.h * H;
    if (t.scrim) {
      var scrim = ctx.createLinearGradient(0, ty - th * 0.6, 0, ty + th);
      scrim.addColorStop(0, 'rgba(10,4,24,0)');
      scrim.addColorStop(1, 'rgba(10,4,24,0.82)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, ty - th * 0.6, W, th * 1.6);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawHalftone(ctx, tx, ty, tw, th, '#ff2e88');
      ctx.restore();
    }

    /* heat meter stars */
    var heat = typeof state.heat === 'number' ? state.heat : 4;
    var starR = Math.max(9, th * 0.16);
    var starY = ty + th * 0.16;
    var starX0 = t.align === 'left' ? tx : tx + tw / 2 - (5 * starR * 2.4) / 2;
    ctx.font = Math.round(starR * 1.5) + 'px Anton, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HEAT', starX0, starY);
    var sx = starX0 + starR * 4.4;
    for (var k = 0; k < 5; k++) {
      drawStar(ctx, sx + k * starR * 2.4, starY, starR, k < heat, k < heat ? '#ffd76b' : '#ffffff');
    }

    /* title lettering */
    var title = (state.title || 'NEON COAST').toUpperCase();
    var titleSize = Math.min(tw / Math.max(6, title.length * 0.62), th * 0.46);
    ctx.save();
    ctx.translate(tx + tw / 2, ty + th * 0.56);
    ctx.transform(1, 0, -0.06, 1, 0, 0);
    ctx.font = titleSize + 'px Anton, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tg = ctx.createLinearGradient(0, -titleSize / 2, 0, titleSize / 2);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(0.55, '#ffe9a8');
    tg.addColorStop(1, '#ff7a3d');
    ctx.lineWidth = Math.max(3, titleSize * 0.09);
    ctx.strokeStyle = '#14042a';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = tg;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    /* neon script subtitle */
    var subtitle = state.subtitle || '';
    if (subtitle) {
      ctx.save();
      ctx.font = Math.max(16, th * 0.24) + 'px Pacifico, cursive';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = Math.max(10, W * 0.014);
      ctx.fillStyle = '#ffd7ec';
      var subY = ty + th * 0.90;
      ctx.fillText(subtitle, tx + tw / 2, subY);
      ctx.restore();
    }

    /* badge ribbon, top-right — fully inside the canvas */
    var badge = state.badge || '';
    if (badge) {
      var bh = Math.max(26, H * 0.045);
      ctx.font = Math.round(bh * 0.52) + 'px Anton, sans-serif';
      var bw = Math.min(W * 0.30, ctx.measureText(badge.toUpperCase()).width + W * 0.05);
      ctx.save();
      ctx.translate(W - bw / 2 - W * 0.03, bh / 2 + H * 0.018);
      ctx.rotate(0.08);
      ctx.fillStyle = '#ff2e88';
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, W * 0.002);
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -bh / 2); ctx.lineTo(bw / 2, -bh / 2);
      ctx.lineTo(bw / 2 + bh * 0.4, 0); ctx.lineTo(bw / 2, bh / 2);
      ctx.lineTo(-bw / 2, bh / 2); ctx.lineTo(-bw / 2 - bh * 0.4, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(badge.toUpperCase(), 0, 1);
      ctx.restore();
    }

    /* grain + vignette */
    var grain = getGrain();
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'overlay';
    var pat = ctx.createPattern(grain, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    var vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(8,2,18,0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    return ctx;
  }

  function renderCover(state, W, H) {
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    drawCover(canvas.getContext('2d'), W, H, state);
    return canvas;
  }

  function loadCoverFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready
    ]).catch(function () { return undefined; });
  }

  global.NeonCoastCover = {
    COVER_LAYOUTS: COVER_LAYOUTS,
    COVER_GRADES: COVER_GRADES,
    EXPORT_SIZES: EXPORT_SIZES,
    layoutById: layoutById,
    gradeById: gradeById,
    drawCover: drawCover,
    renderCover: renderCover,
    loadCoverFonts: loadCoverFonts
  };
})(window);
