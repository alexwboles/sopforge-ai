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
    ['view-forge', 'view-playbook', 'view-sop'].forEach(function (v) {
      el(v).style.display = v === id ? 'block' : 'none';
    });
    ['forge', 'playbook'].forEach(function (t) {
      var tab = el('tab-' + t);
      if (tab) tab.classList.toggle('active', id === 'view-' + t);
    });
    window.scrollTo(0, 0);
  }

  el('tab-forge').addEventListener('click', function () { show('view-forge'); });
  el('tab-playbook').addEventListener('click', function () { show('view-playbook'); renderLibrary(); });

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
    var cnt = el('playbook-count');
    if (cnt) cnt.textContent = lib.length ? lib.length : '';
    if (!lib.length) {
      box.innerHTML = '<p class="muted">No saved SOPs yet. <a href="#" id="empty-forge">Forge your first one</a>, or load a starter template.</p>';
      var ef = el('empty-forge');
      if (ef) ef.addEventListener('click', function (e) { e.preventDefault(); show('view-forge'); });
      return;
    }
    if (!shown.length) {
      box.innerHTML = '<p class="muted">No SOPs match your search.</p>';
      return;
    }
    // Trainual-style subjects: group by role, roles alpha, unassigned last.
    var groups = {};
    shown.forEach(function (s) {
      var r = (s.role || 'Unassigned').trim() || 'Unassigned';
      (groups[r] = groups[r] || []).push(s);
    });
    var order = Object.keys(groups).sort(function (a, b) {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
    function sopCard(s) {
      var p = sopProgress(s);
      var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
      var lastRun = (s.runs && s.runs[0] && s.runs[0].at) ? String(s.runs[0].at).slice(0, 10) : null;
      return '<div class="card sopcard"><div class="sopcard-top"><strong>' + esc(s.name) + '</strong>' +
        '<span class="prognum">' + p.done + '/' + p.total + '</span></div>' +
        '<div class="progressbar"><div class="progressbar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="muted small">' + s.steps.length + ' steps · ' + esc(s.totalTime) +
        (lastRun ? ' · last run ' + esc(lastRun) : ' · never run') + '</div>' +
        '<div class="row">' +
        '<button data-open="' + s.id + '">Open &amp; run</button>' +
        '<button data-dup="' + s.id + '" class="ghost">Duplicate</button>' +
        '<button data-del="' + s.id + '" class="ghost danger">Delete</button>' +
        '</div></div>';
    }
    box.innerHTML = order.map(function (r) {
      return '<div class="subject"><div class="subject-head"><span class="subject-name">' + esc(r) + '</span>' +
        '<span class="muted small">' + groups[r].length + ' SOP' + (groups[r].length === 1 ? '' : 's') + '</span></div>' +
        '<div class="subject-grid">' + groups[r].map(sopCard).join('') + '</div></div>';
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

  /* ---------- import: round-trip a previously exported CSV / Markdown ---------- */
  el('import-btn').addEventListener('click', function () { el('import-file').click(); });
  el('import-file').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || '');
      var sop = /\.csv$/i.test(f.name)
        ? F.sopFromCSV(f.name.replace(/\.csv$/i, ''), text)
        : F.sopFromMarkdown(text);
      if (!sop) {
        alert('Could not read that file — it does not look like a SopForge CSV or Markdown export.');
        return;
      }
      var lib = loadLib();
      lib.unshift(sop); saveLib(lib); renderLibrary();
      openSOP(sop.id);
    };
    reader.readAsText(f);
  });

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

    // owner filter: distinct owners across steps (for shift handoffs)
    var owners = [];
    current.steps.forEach(function (s) {
      if (s.owner && owners.indexOf(s.owner) === -1) owners.push(s.owner);
    });
    var ofilter = el('owner-filter');
    var keepOwner = ofilter.value;
    ofilter.innerHTML = '<option value="">Everyone</option>' + owners.map(function (o) {
      return '<option' + (o === keepOwner ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('');
    if (owners.indexOf(keepOwner) === -1) ofilter.value = '';

    // completion banner: celebrate the run, record when it finished
    var banner = el('complete-banner');
    if (p.total > 0 && p.pct === 100) {
      if (!current.completedAt) {
        current.completedAt = new Date().toISOString();
        // log the run: wall-clock from first checked step to completion
        var mins = null;
        if (current.runStartedAt) {
          mins = Math.max(1, Math.round((Date.now() - new Date(current.runStartedAt).getTime()) / 60000));
        }
        current.runs = current.runs || [];
        current.runs.unshift({ at: current.completedAt, steps: p.total, minutes: mins });
        current.runs = current.runs.slice(0, 20);
        current.runStartedAt = null;
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

    var only = ofilter.value;
    el('step-list').innerHTML = current.steps.map(function (s, i) {
      if (only && s.owner !== only) return '';
      return '<div class="step-row"><label class="step' + (s.done ? ' done' : '') + '">' +
        '<input type="checkbox" data-step="' + i + '"' + (s.done ? ' checked' : '') + '>' +
        '<span class="step-n">' + s.n + '</span>' +
        '<span class="step-body"><strong>' + esc(s.text) + '</strong>' +
        '<span class="muted small"><button class="owner-badge" data-owner-step="' + i + '" title="Assign owner">' +
        esc(s.owner) + '</button> · ' + esc(s.time) +
        ' <span class="step-timer" data-timer-label="' + i + '"></span></span>' +
        '<span class="tip"><strong>Watch out:</strong> ' + esc(s.tip) + '</span></span></label>' +
        '<div class="step-tools">' +
        '<button class="step-tool ghost" data-move-step="' + i + '" data-dir="-1" title="Move step up" aria-label="Move step ' + s.n + ' up">↑</button>' +
        '<button class="step-tool ghost" data-move-step="' + i + '" data-dir="1" title="Move step down" aria-label="Move step ' + s.n + ' down">↓</button>' +
        '<button class="step-tool ghost" data-timer-step="' + i + '" title="Start ' + esc(s.time) + ' timer" aria-label="Start timer for step ' + s.n + '">⏱</button>' +
        '<button class="step-del ghost danger" data-del-step="' + i + '" title="Delete step" aria-label="Delete step ' + s.n + '">✕</button></div></div>';
    }).join('');

    renderRunHistory();

    // version-history dropdown
    var vers = current.versions || [];
    el('version-sel').innerHTML = '<option value="">Versions (' + vers.length + ')</option>' +
      vers.map(function (v, vi) {
        return '<option value="' + vi + '">' + esc(v.at.slice(0, 16).replace('T', ' ')) +
          ' · ' + v.stepCount + ' steps</option>';
      }).join('');
  }

  /* Run history: every completed run with wall-clock duration + average. */
  function renderRunHistory() {
    var box = el('run-history');
    var runs = current.runs || [];
    if (!runs.length) { box.innerHTML = ''; return; }
    var timed = runs.filter(function (r) { return r.minutes != null; });
    var avg = timed.length
      ? Math.round(timed.reduce(function (a, r) { return a + r.minutes; }, 0) / timed.length)
      : null;
    box.innerHTML = '<h3>Run history <span class="muted small">' + runs.length + ' completed' +
      (avg != null ? ' · avg ' + avg + ' min' : '') + '</span></h3>' +
      '<ul class="run-list">' + runs.map(function (r) {
        return '<li><span>' + esc(String(r.at).slice(0, 16).replace('T', ' ')) + '</span>' +
          '<span class="muted small">' + r.steps + ' steps' +
          (r.minutes != null ? ' · ' + r.minutes + ' min' : '') + '</span></li>';
      }).join('') + '</ul>';
  }

  el('owner-filter').addEventListener('change', renderSOP);

  el('step-list').addEventListener('change', function (e) {
    var i = e.target.dataset && e.target.dataset.step;
    if (i === undefined) return;
    var wasDone = current.steps.filter(function (s) { return s.done; }).length;
    current.steps[+i].done = e.target.checked;
    // a fresh run starts at the first checked step; reset clears it
    if (wasDone === 0 && e.target.checked && !current.runStartedAt) {
      current.runStartedAt = new Date().toISOString();
    }
    saveCurrent();
    renderSOP();
  });

  el('step-list').addEventListener('click', function (e) {
    var t = e.target;
    var oi = t.dataset && t.dataset.ownerStep;
    if (oi !== undefined) {
      e.preventDefault();
      var cur = current.steps[+oi];
      var val = prompt('Assign owner for step ' + cur.n + ' ("' + cur.text.slice(0, 50) + '"):', cur.owner);
      if (val !== null && val.trim()) {
        cur.owner = val.trim().slice(0, 40);
        saveCurrent();
        renderSOP();
      }
      return;
    }
    if (t.dataset && t.dataset.moveStep !== undefined) {
      if (F.moveStep(current, +t.dataset.moveStep, +(t.dataset.dir || 0))) {
        saveCurrent();
        renderSOP();
      }
      return;
    }
    if (t.dataset && t.dataset.timerStep !== undefined) {
      startStepTimer(+t.dataset.timerStep);
      return;
    }
    var i = t.dataset && t.dataset.delStep;
    if (i === undefined) return;
    if (!confirm('Delete step ' + current.steps[+i].n + ' ("' + current.steps[+i].text.slice(0, 40) + '…")?')) return;
    F.removeStep(current, +i);
    saveCurrent();
    renderSOP();
  });

  /* ---------- per-step countdown timers ---------- */
  var stepTimers = {}; // stepIndex -> interval id

  function fmtClock(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function timerBeep() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ac = timerBeep.ctx || (timerBeep.ctx = new AC());
      [880, 660].forEach(function (freq, k) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.value = freq;
        var t0 = ac.currentTime + k * 0.3;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
        o.start(t0); o.stop(t0 + 0.3);
      });
    } catch (err) { /* audio unavailable — non-fatal */ }
  }

  function startStepTimer(i) {
    var s = current.steps[i];
    if (!s) return;
    if (stepTimers[i]) { clearInterval(stepTimers[i]); delete stepTimers[i]; renderSOP(); return; }
    var remain = F.stepMinutes(s.time) * 60;
    var label = document.querySelector('[data-timer-label="' + i + '"]');
    function paint() { if (label) label.textContent = '⏱ ' + fmtClock(remain); }
    paint();
    stepTimers[i] = setInterval(function () {
      remain--;
      if (remain <= 0) {
        clearInterval(stepTimers[i]);
        delete stepTimers[i];
        timerBeep();
        s.done = true;
        saveCurrent();
        renderSOP();
        alert('Step ' + s.n + ' timer finished ("' + s.text.slice(0, 60) + '") — marked done.');
        return;
      }
      paint();
    }, 1000);
  }

  /* ---------- version history ---------- */
  el('snapshot-btn').addEventListener('click', function () {
    current.versions = current.versions || [];
    current.versions.push(F.snapshotSOP(current));
    if (current.versions.length > 10) current.versions = current.versions.slice(-10);
    saveCurrent();
    renderSOP();
  });

  el('restore-btn').addEventListener('click', function () {
    var vi = el('version-sel').value;
    if (vi === '' || !current.versions || !current.versions[+vi]) return;
    var v = current.versions[+vi];
    if (!confirm('Restore the version from ' + v.at.slice(0, 16).replace('T', ' ') +
        ' (' + v.stepCount + ' steps)? Current steps will be replaced.')) return;
    F.restoreVersion(current, v);
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
    current.completedAt = null;   // next completion is a new run
    current.runStartedAt = null;
    var lib = loadLib().map(function (x) { return x.id === current.id ? current : x; });
    saveLib(lib); renderSOP();
  });
  el('print-btn').addEventListener('click', function () { window.print(); });
  el('back-btn').addEventListener('click', function () { renderLibrary(); show('view-playbook'); });
  el('library-btn').addEventListener('click', function () {
    renderLibrary(); show('view-playbook');
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
