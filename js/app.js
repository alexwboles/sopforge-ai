/* SopForge UI — library (localStorage), checklist mode, print, optional AI polish. */
(function () {
  'use strict';
  var F = window.SopForge;
  var KEY = 'sopforge_library_v1';
  var current = null;

  function loadLib() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function saveLib(lib) { localStorage.setItem(KEY, JSON.stringify(lib)); }

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- views ----------
  function show(id) {
    ['view-forge', 'view-sop'].forEach(function (v) {
      el(v).style.display = v === id ? 'block' : 'none';
    });
    window.scrollTo(0, 0);
  }

  // ---------- library ----------
  function sopProgress(s) {
    var done = (s.steps || []).filter(function (x) { return x.done; }).length;
    return { done: done, total: (s.steps || []).length };
  }

  function renderLibrary() {
    var lib = loadLib();
    // role filter options (distinct roles in the library)
    var roleSel = el('library-role');
    var roles = [];
    lib.forEach(function (s) { if (s.role && roles.indexOf(s.role) === -1) roles.push(s.role); });
    var keep = roleSel.value;
    roleSel.innerHTML = '<option value="">All roles</option>' + roles.map(function (r) {
      return '<option' + (r === keep ? ' selected' : '') + '>' + esc(r) + '</option>';
    }).join('');
    if (roles.indexOf(keep) === -1) roleSel.value = '';

    var q = el('library-search').value.trim().toLowerCase();
    var shown = lib.filter(function (s) {
      if (roleSel.value && s.role !== roleSel.value) return false;
      if (!q) return true;
      var hay = (s.name + ' ' + s.role + ' ' + (s.steps || []).map(function (x) { return x.text; }).join(' ')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    var box = el('library-list');
    if (!lib.length) {
      box.innerHTML = '<p class="muted">No saved SOPs yet. Forge one above, or load a starter template.</p>';
      return;
    }
    if (!shown.length) {
      box.innerHTML = '<p class="muted">No SOPs match your search.</p>';
      return;
    }
    box.innerHTML = shown.map(function (s) {
      var p = sopProgress(s);
      return '<div class="card"><div><strong>' + esc(s.name) + '</strong>' +
        '<div class="muted small">' + esc(s.role) + ' · ' + s.steps.length + ' steps · ' + esc(s.totalTime) +
        ' · <span class="prog">' + p.done + '/' + p.total + ' done</span></div></div>' +
        '<div class="row">' +
        '<button data-open="' + s.id + '">Open</button>' +
        '<button data-dup="' + s.id + '" class="ghost">Duplicate</button>' +
        '<button data-del="' + s.id + '" class="ghost danger">Delete</button>' +
        '</div></div>';
    }).join('');
  }

  el('library-search').addEventListener('input', renderLibrary);
  el('library-role').addEventListener('change', renderLibrary);

  el('library-list').addEventListener('click', function (e) {
    var lib = loadLib();
    var t = e.target;
    if (t.dataset.open) { openSOP(t.dataset.open); }
    else if (t.dataset.dup) {
      var s = lib.find(function (x) { return x.id === t.dataset.dup; });
      if (s) {
        var copy = JSON.parse(JSON.stringify(s));
        copy.id = 'sop_' + Date.now().toString(36);
        copy.name = s.name + ' (copy)';
        copy.createdAt = new Date().toISOString();
        lib.unshift(copy); saveLib(lib); renderLibrary();
      }
    } else if (t.dataset.del) {
      if (confirm('Delete this SOP?')) {
        saveLib(lib.filter(function (x) { return x.id !== t.dataset.del; }));
        renderLibrary();
      }
    }
  });

  // ---------- templates ----------
  function renderTemplates() {
    el('template-list').innerHTML = F.TEMPLATES.map(function (t, i) {
      return '<button class="chip" data-tpl="' + i + '">' + esc(t.name) + '</button>';
    }).join('');
  }
  el('template-list').addEventListener('click', function (e) {
    var i = e.target.dataset && e.target.dataset.tpl;
    if (i === undefined) return;
    var t = F.TEMPLATES[+i];
    el('proc-name').value = t.name;
    el('proc-role').value = t.role;
    el('proc-desc').value = t.description;
    forge();
  });

  // ---------- forge ----------
  function forge() {
    var name = el('proc-name').value.trim();
    var role = el('proc-role').value.trim();
    var desc = el('proc-desc').value.trim();
    var err = el('forge-error');
    if (desc.split(/\s+/).filter(Boolean).length < 5) {
      err.textContent = 'Give me a little more — at least a few words describing the process.';
      return;
    }
    err.textContent = '';
    current = F.forgeSOP(name, role, desc);
    if (!current.steps.length) {
      err.textContent = 'I couldn\'t pull any steps out of that. Try one action per line, or short sentences.';
      return;
    }
    var lib = loadLib();
    lib.unshift(current); saveLib(lib);
    renderLibrary();
    openSOP(current.id);
  }
  el('forge-btn').addEventListener('click', forge);

  // ---------- SOP view / checklist ----------
  function openSOP(id) {
    var lib = loadLib();
    current = lib.find(function (x) { return x.id === id; });
    if (!current) return;
    renderSOP();
    show('view-sop');
  }

  function progress() {
    var done = current.steps.filter(function (s) { return s.done; }).length;
    return { done: done, total: current.steps.length, pct: Math.round(done / current.steps.length * 100) };
  }

  function saveCurrent() {
    if (!current) return;
    var lib = loadLib().map(function (x) { return x.id === current.id ? current : x; });
    saveLib(lib);
  }

  function renderSOP() {
    var p = progress();
    el('sop-title').textContent = current.name;
    el('sop-meta').textContent = current.role + ' · ' + current.steps.length + ' steps · about ' + current.totalTime;
    el('progress-fill').style.width = p.pct + '%';
    el('progress-label').textContent = p.done + ' of ' + p.total + ' done (' + p.pct + '%)';

    // completion banner: celebrate the run, record when it finished
    var banner = el('complete-banner');
    if (p.total > 0 && p.pct === 100) {
      if (!current.completedAt) {
        current.completedAt = new Date().toISOString();
        saveCurrent();
      }
      banner.style.display = 'block';
      banner.innerHTML = '<strong>Run complete.</strong> All ' + p.total + ' steps done in about ' +
        esc(current.totalTime) + ' — completed ' +
        esc(current.completedAt.slice(0, 16).replace('T', ' ')) + '.';
    } else {
      banner.style.display = 'none';
      banner.innerHTML = '';
    }

    el('step-list').innerHTML = current.steps.map(function (s, i) {
      return '<div class="step-row"><label class="step' + (s.done ? ' done' : '') + '">' +
        '<input type="checkbox" data-step="' + i + '"' + (s.done ? ' checked' : '') + '>' +
        '<span class="step-n">' + s.n + '</span>' +
        '<span class="step-body"><strong>' + esc(s.text) + '</strong>' +
        '<span class="muted small">' + esc(s.owner) + ' · ' + esc(s.time) + '</span>' +
        '<span class="tip"><strong>Watch out:</strong> ' + esc(s.tip) + '</span></span></label>' +
        '<button class="step-del ghost danger" data-del-step="' + i + '" title="Delete step" aria-label="Delete step ' + s.n + '">✕</button></div>';
    }).join('');
  }

  el('step-list').addEventListener('change', function (e) {
    var i = e.target.dataset && e.target.dataset.step;
    if (i === undefined) return;
    current.steps[+i].done = e.target.checked;
    saveCurrent();
    renderSOP();
  });

  el('step-list').addEventListener('click', function (e) {
    var i = e.target.dataset && e.target.dataset.delStep;
    if (i === undefined) return;
    if (!confirm('Delete step ' + current.steps[+i].n + ' ("' + current.steps[+i].text.slice(0, 40) + '…")?')) return;
    F.removeStep(current, +i);
    saveCurrent();
    renderSOP();
  });

  function downloadText(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function slug(s) { return String(s || 'sop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sop'; }

  el('add-step-btn').addEventListener('click', function () {
    var text = prompt('New step — describe the action in a sentence:');
    if (text === null) return;
    var added = F.addStep(current, text);
    if (!added) { alert('That was too short — give me at least a couple of words.'); return; }
    saveCurrent();
    renderSOP();
    window.scrollTo(0, document.body.scrollHeight);
  });

  el('csv-btn').addEventListener('click', function () {
    if (!current) return;
    downloadText(slug(current.name) + '.csv', F.sopToCSV(current), 'text/csv;charset=utf-8');
  });

  el('md-btn').addEventListener('click', function () {
    if (!current) return;
    downloadText(slug(current.name) + '.md', F.sopToMarkdown(current), 'text/markdown;charset=utf-8');
  });

  el('reset-btn').addEventListener('click', function () {
    current.steps.forEach(function (s) { s.done = false; });
    var lib = loadLib().map(function (x) { return x.id === current.id ? current : x; });
    saveLib(lib); renderSOP();
  });
  el('print-btn').addEventListener('click', function () { window.print(); });
  el('back-btn').addEventListener('click', function () { renderLibrary(); show('view-forge'); });
  el('library-btn').addEventListener('click', function () {
    renderLibrary(); show('view-forge');
    setTimeout(function () { el('library-panel').scrollIntoView({ behavior: 'smooth' }); }, 0);
  });

  // ---------- optional AI polish (owner's own key, never required) ----------
  el('polish-btn').addEventListener('click', async function () {
    var key = el('ai-key').value.trim();
    var msg = el('polish-msg');
    if (!key) { msg.textContent = 'Paste your OpenAI key to polish — or skip it, the local forge works fine.'; return; }
    if (!current || !current.steps.length) { msg.textContent = 'Forge an SOP first.'; return; }
    msg.textContent = 'Polishing…';
    try {
      var resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Rewrite these SOP steps to be clearer and more professional. Return JSON array of strings, same length, same order.' },
            { role: 'user', content: JSON.stringify(current.steps.map(function (s) { return s.text; })) },
          ],
        }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      var arr = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, ''));
      if (Array.isArray(arr) && arr.length === current.steps.length) {
        arr.forEach(function (t, i) { current.steps[i].text = String(t); });
        var lib = loadLib().map(function (x) { return x.id === current.id ? current : x; });
        saveLib(lib); renderSOP();
        msg.textContent = 'Polished. Key kept only in this tab — it is never saved.';
      } else { msg.textContent = 'AI returned something odd — kept your original steps.'; }
    } catch (e) {
      msg.textContent = 'Couldn\'t reach the AI (' + e.message + ') — your original steps are untouched.';
    }
    el('ai-key').value = ''; // never persist the key
  });

  // ---------- boot ----------
  renderTemplates();
  renderLibrary();
  show('view-forge');
})();
