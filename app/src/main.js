/* Neon Coast Cover Studio — editor wiring.
 * Owns the editor state, undo/redo history, photo loading (FileReader,
 * never uploaded), per-panel crop/zoom/position, live preview rendering,
 * three-size PNG export, and the ?shot= scenes the maker uses to capture
 * screenshots of the app and of its exported covers. */
(function () {
  'use strict';

  var Cover = window.NeonCoastCover;
  var stage = document.getElementById('stage');
  var sctx = stage.getContext('2d');

  var MAX_PANELS = 9;
  var state = {
    layout: 'nine',
    grade: 'sunset',
    gradeStrength: 70,
    title: 'NEON COAST',
    subtitle: 'vice city nights',
    badge: 'VICE CITY',
    heat: 4,
    photos: [],
    panels: [],
    selectedPanel: 0,
    previewSize: { w: 1080, h: 1080 }
  };
  for (var i = 0; i < MAX_PANELS; i++) {
    state.panels.push({ photo: 0, zoom: 100, ox: 0, oy: 0 });
  }

  /* ---------- undo / redo ---------- */
  var history = [];
  var future = [];
  function snapshot() {
    return JSON.stringify({
      layout: state.layout, grade: state.grade, gradeStrength: state.gradeStrength,
      title: state.title, subtitle: state.subtitle, badge: state.badge, heat: state.heat,
      panels: state.panels, selectedPanel: state.selectedPanel
    });
  }
  function restore(json) {
    var s = JSON.parse(json);
    state.layout = s.layout; state.grade = s.grade; state.gradeStrength = s.gradeStrength;
    state.title = s.title; state.subtitle = s.subtitle; state.badge = s.badge; state.heat = s.heat;
    state.panels = s.panels; state.selectedPanel = s.selectedPanel;
    syncControls();
    render();
  }
  function commit() {
    history.push(snapshot());
    if (history.length > 60) history.shift();
    future.length = 0;
    updateUndoButtons();
  }
  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
    updateUndoButtons();
  }
  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
    updateUndoButtons();
  }
  function updateUndoButtons() {
    document.getElementById('undoBtn').disabled = history.length === 0;
    document.getElementById('redoBtn').disabled = future.length === 0;
  }

  /* ---------- rendering ---------- */
  function render() {
    var W = state.previewSize.w, H = state.previewSize.h;
    if (stage.width !== W) stage.width = W;
    if (stage.height !== H) stage.height = H;
    Cover.drawCover(sctx, W, H, state);
    drawSelection();
  }
  function drawSelection() {
    if (document.body.classList.contains('shot')) return; /* clean cover captures */
    var layout = Cover.layoutById(state.layout);
    var W = stage.width, H = stage.height;
    var idx = state.selectedPanel;
    if (idx >= layout.panels.length) return;
    var p = layout.panels[idx];
    sctx.save();
    sctx.setLineDash([10, 8]);
    sctx.lineWidth = Math.max(3, W * 0.004);
    sctx.strokeStyle = '#2de2c5';
    sctx.strokeRect(p.x * W + 2, p.y * H + 2, p.w * W - 4, p.h * H - 4);
    sctx.setLineDash([]);
    sctx.restore();
  }

  /* ---------- controls ---------- */
  function el(id) { return document.getElementById(id); }
  function chipRow(containerId, items, current, onPick) {
    var row = el(containerId);
    row.innerHTML = '';
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = item.name;
      if (item.id === current) b.className = 'active';
      b.addEventListener('click', function () { onPick(item.id); });
      row.appendChild(b);
    });
  }
  function syncChips() {
    chipRow('layoutRow', Cover.COVER_LAYOUTS, state.layout, function (id) {
      commit(); state.layout = id; state.selectedPanel = 0; syncControls(); render();
    });
    chipRow('gradeRow', Cover.COVER_GRADES, state.grade, function (id) {
      commit(); state.grade = id; syncControls(); render();
    });
    el('layoutName').textContent = Cover.layoutById(state.layout).name;
    el('gradeName').textContent = Cover.gradeById(state.grade).name;
  }
  function syncControls() {
    syncChips();
    el('titleInput').value = state.title;
    el('subtitleInput').value = state.subtitle;
    el('badgeInput').value = state.badge;
    el('heatInput').value = state.heat;
    el('heatOut').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    el('gradeStrength').value = state.gradeStrength;
    el('gradeOut').textContent = state.gradeStrength + '%';
    syncPanelControls();
    renderPhotoStrip();
  }
  function syncPanelControls() {
    var layout = Cover.layoutById(state.layout);
    var idx = Math.min(state.selectedPanel, layout.panels.length - 1);
    state.selectedPanel = idx;
    el('panelName').textContent = 'Panel ' + (idx + 1) + ' of ' + layout.panels.length;
    var slot = state.panels[idx];
    var sel = el('panelPhoto');
    sel.innerHTML = '';
    state.photos.forEach(function (ph, pi) {
      var opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = (pi + 1) + ' · ' + ph.name;
      sel.appendChild(opt);
    });
    if (!state.photos.length) {
      var opt0 = document.createElement('option');
      opt0.value = '0'; opt0.textContent = 'No photos yet — load a sample';
      sel.appendChild(opt0);
    }
    sel.value = String(Math.min(slot.photo, Math.max(0, state.photos.length - 1)));
    el('zoomInput').value = slot.zoom;
    el('zoomOut').textContent = slot.zoom + '%';
    el('oxInput').value = slot.ox;
    el('oxOut').textContent = slot.ox;
    el('oyInput').value = slot.oy;
    el('oyOut').textContent = slot.oy;
  }
  function renderPhotoStrip() {
    var strip = el('photoStrip');
    strip.innerHTML = '';
    state.photos.forEach(function (ph, pi) {
      var img = document.createElement('img');
      img.src = ph.img.src;
      img.alt = ph.name;
      img.title = ph.name + ' — click to fill the selected panel';
      if (state.panels[state.selectedPanel] && state.panels[state.selectedPanel].photo === pi) {
        img.className = 'selected';
      }
      img.addEventListener('click', function () {
        commit();
        state.panels[state.selectedPanel].photo = pi;
        syncPanelControls(); render();
      });
      strip.appendChild(img);
    });
  }

  /* ---------- photos ---------- */
  function addPhoto(img, name) {
    state.photos.push({ img: img, name: name });
    if (state.photos.length === 1) {
      for (var i = 0; i < MAX_PANELS; i++) state.panels[i].photo = 0;
    }
    renderPhotoStrip();
    syncPanelControls();
    render();
  }
  function loadImageFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () { addPhoto(img, file.name); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function loadImageUrl(url, name) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { addPhoto(img, name); resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }
  function loadSamples() {
    return Promise.all([
      loadImageUrl('samples/boulevard.jpg', 'boulevard.jpg'),
      loadImageUrl('samples/pier.jpg', 'pier.jpg')
    ]).then(function () {
      /* alternate the two samples across the panels */
      for (var i = 0; i < MAX_PANELS; i++) state.panels[i].photo = i % 2;
      syncPanelControls(); render();
    });
  }

  /* ---------- export ---------- */
  function downloadCanvas(canvas, filename) {
    canvas.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 4000);
    }, 'image/png');
  }
  function exportSize(size) {
    var canvas = Cover.renderCover(state, size.w, size.h);
    downloadCanvas(canvas, 'neon-coast-cover-' + size.w + 'x' + size.h + '.png');
  }
  function exportAll() {
    Cover.EXPORT_SIZES.forEach(function (size, i) {
      setTimeout(function () { exportSize(size); }, i * 350);
    });
  }

  /* ---------- panel picking + drag on the canvas ---------- */
  function canvasPoint(evt) {
    var rect = stage.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) / rect.width * stage.width,
      y: (evt.clientY - rect.top) / rect.height * stage.height
    };
  }
  function panelAt(x, y) {
    var layout = Cover.layoutById(state.layout);
    for (var i = layout.panels.length - 1; i >= 0; i--) {
      var p = layout.panels[i];
      if (x >= p.x * stage.width && x <= (p.x + p.w) * stage.width &&
          y >= p.y * stage.height && y <= (p.y + p.h) * stage.height) {
        return i;
      }
    }
    return -1;
  }
  var drag = null;
  stage.addEventListener('pointerdown', function (evt) {
    var pt = canvasPoint(evt);
    var idx = panelAt(pt.x, pt.y);
    if (idx < 0) return;
    commit();
    state.selectedPanel = idx;
    syncPanelControls();
    drag = { idx: idx, x: pt.x, y: pt.y, ox: state.panels[idx].ox, oy: state.panels[idx].oy };
    stage.setPointerCapture(evt.pointerId);
    render();
  });
  stage.addEventListener('pointermove', function (evt) {
    if (!drag) return;
    var pt = canvasPoint(evt);
    var slot = state.panels[drag.idx];
    slot.ox = Math.max(-100, Math.min(100, drag.ox + (pt.x - drag.x) / stage.width * 250));
    slot.oy = Math.max(-100, Math.min(100, drag.oy + (pt.y - drag.y) / stage.height * 250));
    syncPanelControls();
    render();
  });
  stage.addEventListener('pointerup', function () { drag = null; });

  /* ---------- wire up controls ---------- */
  el('photoInput').addEventListener('change', function (evt) {
    Array.prototype.forEach.call(evt.target.files, loadImageFile);
    evt.target.value = '';
  });
  el('sampleBtn').addEventListener('click', function () { commit(); loadSamples(); });
  el('titleInput').addEventListener('input', function (evt) {
    state.title = evt.target.value; render();
  });
  el('titleInput').addEventListener('change', commit);
  el('subtitleInput').addEventListener('input', function (evt) {
    state.subtitle = evt.target.value; render();
  });
  el('subtitleInput').addEventListener('change', commit);
  el('badgeInput').addEventListener('input', function (evt) {
    state.badge = evt.target.value; render();
  });
  el('badgeInput').addEventListener('change', commit);
  el('heatInput').addEventListener('input', function (evt) {
    state.heat = parseInt(evt.target.value, 10);
    el('heatOut').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    render();
  });
  el('heatInput').addEventListener('change', commit);
  el('gradeStrength').addEventListener('input', function (evt) {
    state.gradeStrength = parseInt(evt.target.value, 10);
    el('gradeOut').textContent = state.gradeStrength + '%';
    render();
  });
  el('gradeStrength').addEventListener('change', commit);
  el('panelPhoto').addEventListener('change', function (evt) {
    commit();
    state.panels[state.selectedPanel].photo = parseInt(evt.target.value, 10);
    renderPhotoStrip(); render();
  });
  el('zoomInput').addEventListener('input', function (evt) {
    state.panels[state.selectedPanel].zoom = parseInt(evt.target.value, 10);
    el('zoomOut').textContent = evt.target.value + '%';
    render();
  });
  el('zoomInput').addEventListener('change', commit);
  el('oxInput').addEventListener('input', function (evt) {
    state.panels[state.selectedPanel].ox = parseInt(evt.target.value, 10);
    el('oxOut').textContent = evt.target.value;
    render();
  });
  el('oxInput').addEventListener('change', commit);
  el('oyInput').addEventListener('input', function (evt) {
    state.panels[state.selectedPanel].oy = parseInt(evt.target.value, 10);
    el('oyOut').textContent = evt.target.value;
    render();
  });
  el('oyInput').addEventListener('change', commit);
  el('fillAllBtn').addEventListener('click', function () {
    commit();
    var photo = state.panels[state.selectedPanel].photo;
    for (var i = 0; i < MAX_PANELS; i++) state.panels[i].photo = photo;
    render();
  });
  el('resetPanelBtn').addEventListener('click', function () {
    commit();
    state.panels[state.selectedPanel] = { photo: state.panels[state.selectedPanel].photo, zoom: 100, ox: 0, oy: 0 };
    syncPanelControls(); render();
  });
  el('undoBtn').addEventListener('click', undo);
  el('redoBtn').addEventListener('click', redo);
  el('exportAllBtn').addEventListener('click', exportAll);
  Array.prototype.forEach.call(document.querySelectorAll('.export-one'), function (btn) {
    btn.addEventListener('click', function () {
      var parts = btn.getAttribute('data-size').split('x');
      exportSize({ w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) });
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.stage-sizes button'), function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.stage-sizes button'), function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      var parts = btn.getAttribute('data-preview').split('x');
      state.previewSize = { w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) };
      el('stageLabel').textContent = 'Live preview — ' + parts[0] + ' × ' + parts[1];
      render();
    });
  });
  document.addEventListener('keydown', function (evt) {
    if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'z' && !evt.shiftKey) {
      evt.preventDefault(); undo();
    } else if ((evt.ctrlKey || evt.metaKey) && (evt.key.toLowerCase() === 'y' ||
        (evt.key.toLowerCase() === 'z' && evt.shiftKey))) {
      evt.preventDefault(); redo();
    }
  });

  /* ---------- shot scenes (maker's screenshot capture) ---------- */
  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  /* only the cover scene hides the editor chrome; the editor scene
   * keeps the full UI so the screenshot shows the app at work */
  if (shot === 'cover') {
    document.body.classList.add('shot');
  }
  function applyShotParams() {
    if (params.get('layout')) state.layout = params.get('layout');
    if (params.get('grade')) state.grade = params.get('grade');
    if (params.get('title')) state.title = params.get('title');
    if (params.get('subtitle')) state.subtitle = params.get('subtitle');
    if (params.get('badge')) state.badge = params.get('badge');
    if (params.get('heat')) state.heat = parseInt(params.get('heat'), 10);
    if (params.get('size')) {
      var parts = params.get('size').split('x');
      state.previewSize = { w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) };
    }
  }

  /* ---------- boot ---------- */
  syncControls();
  updateUndoButtons();
  Cover.loadCoverFonts().then(function () {
    if (shot === 'cover' || shot === 'editor') {
      applyShotParams();
      /* cover scene: the canvas IS the export size from ?size=
       * (default 1920x1080); CSS stretches it to the window, which the
       * capture driver sizes to the same aspect, so no black bars. */
      loadSamples().then(function () {
        syncControls();
        render();
        document.title = 'cover-ready';
      });
    } else {
      render();
    }
  });
})();
