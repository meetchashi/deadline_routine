(function () {
  'use strict';


  var LOCAL_KEY = 'deadline-board-local-v2';
  var OLD_KEY = 'deadline-board-v1';
  var NAMES = { icebox: 'Icebox', pending: 'Pending', progress: 'In progress', done: 'Completed' };
  // Column order on screen is Pending, In progress, Completed, Icebox. Each move is [target, icon].
  var MOVES = {
    icebox: [['pending', 'left']],
    pending: [['icebox', 'ice'], ['progress', 'right']],
    progress: [['pending', 'left'], ['done', 'right']],
    done: [['progress', 'left']]
  };
  var ICONS = {
    left: 'M15 6l-6 6 6 6',
    right: 'M9 6l6 6-6 6',
    ice: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5',
    edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    subs: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    flame: 'M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5.5 1.5 1 2.5 2 3 3.5.5-2.5.5-5.5 0-8.5z'
  };
  var LISTS = ['icebox', 'pending', 'progress', 'done'];
  var EMPTY = {
    icebox: 'Nothing parked. Ideas for later go here.',
    pending: 'Nothing waiting. Tap Add task to plan something.',
    progress: 'Move a task here when you start it.',
    done: 'Finished tasks land here.'
  };

  var ROUTINE_KEY = 'deadline-board-routines-v1';
  var routines = [];
  var bookings = [];
  var BOOKING_KEY = 'deadline-board-bookings-v1';
  var rEditingId = null;
  var rArmedId = null;
  var rArmTimer = null;
  var col = null;            // Firestore-style collection when synced storage is available
  var tasks = [];
  var loading = true;
  var chains = {};
  var open = {};
  var editingId = null;
  var armedId = null;
  var armTimer = null;
  var opener = null;

  function $(sel) { return document.querySelector(sel); }
  function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // Older saved subtasks used a done flag; every subtask now carries a status.
  function normSubs(t) {
    if (!Array.isArray(t.subs)) t.subs = [];
    t.subs.forEach(function (s) { if (!s.status) s.status = s.done ? 'done' : 'pending'; });
    return t;
  }
  function icon(name) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', ICONS[name]);
    svg.appendChild(path);
    return svg;
  }
  // Small square icon button; the label doubles as tooltip and screen reader name.
  function ibtn(name, label, onclick, extra) {
    var b = h('button', { type: 'button', class: 'ibtn' + (extra ? ' ' + extra : ''), title: label, 'aria-label': label, onclick: onclick });
    b.appendChild(icon(name));
    return b;
  }
  function findTask(id) { return tasks.find(function (x) { return x.id === id; }); }

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  var syncTimer = null;
  function setSync(text, bad) {
    var el = $('#sync');
    el.textContent = text;
    el.className = 'sync' + (bad ? ' bad' : '');
  }
  var SYNC_OK = 'Saved to your account. Open this page on any device and the same tasks appear.';
  function onWriteError() {
    setSync('That change could not be saved. Check your connection and try again.', true);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { setSync(col ? SYNC_OK : 'Saved on this device only.'); }, 6000);
  }

  // Storage: tasks live in chrome.storage.local so the background worker can read them for reminders.
  var HAS_CHROME = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  function persistLocal() {
    if (HAS_CHROME) { chrome.storage.local.set({ tasks: tasks }).catch(onWriteError); }
    else { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks)); } catch (e) { /* storage unavailable */ } }
  }
  function commit(t) {
    var i = tasks.findIndex(function (x) { return x.id === t.id; });
    if (i >= 0) tasks[i] = t; else tasks.push(t);
    persistLocal(); render();
  }
  function destroy(id) {
    tasks = tasks.filter(function (x) { return x.id !== id; });
    persistLocal(); render();
  }

  function toneOf(t) {
    if (t.status === 'icebox') return 'ice';
    if (t.status === 'done') return 'done';
    if (t.status === 'pending') return urgency(t) === 'hot' ? 'hot' : 'need';
    return 'safe';
  }

  function moveTask(id, status) {
    var src = findTask(id);
    if (!src || src.status === status) return;
    var t = clone(src);
    t.status = status;
    if (status === 'done') t.subs.forEach(function (s) { s.status = 'done'; });
    commit(t);
  }
  function setSubStatus(id, sid, status) {
    var src = findTask(id); if (!src) return;
    var t = clone(src);
    var s = t.subs.find(function (x) { return x.id === sid; });
    if (!s || s.status === status) return;
    s.status = status;
    syncFromSubs(t); commit(t);
  }
  function addSub(id, title) {
    var src = findTask(id); if (!src) return;
    var t = clone(src);
    t.subs.push({ id: uid(), title: title.slice(0, 120), status: 'pending' });
    syncFromSubs(t); commit(t);
    setTimeout(function () { var i = document.getElementById('sa-' + id); if (i) i.focus(); }, 60);
  }
  function removeSub(id, sid) {
    var src = findTask(id); if (!src) return;
    var t = clone(src);
    t.subs = t.subs.filter(function (x) { return x.id !== sid; });
    syncFromSubs(t); commit(t);
  }
  function armDelete(id) {
    if (armedId === id) {
      armedId = null; clearTimeout(armTimer);
      destroy(id);
      if (!col) return;
      render();
      return;
    }
    armedId = id; clearTimeout(armTimer);
    armTimer = setTimeout(function () { armedId = null; render(); }, 3000);
    render();
  }
  async function removeSamples() {
    var ids = tasks.filter(function (t) { return t.sample; }).map(function (t) { return t.id; });
    if (!col) { tasks = tasks.filter(function (t) { return !t.sample; }); persistLocal(); render(); return; }
    for (var i = 0; i < ids.length; i++) {
      try { await (chains[ids[i]] || Promise.resolve()); await col.doc(ids[i]).delete(); }
      catch (e) { onWriteError(); break; }
    }
  }

  function card(t) {
    var tone = toneOf(t);
    var el = h('article', { class: 't-' + tone + ' card' + (t.status === 'done' ? ' is-done' : ''), draggable: 'true', 'data-id': t.id });
    el.addEventListener('dragstart', function (e) {
      e.dataTransfer.setData('text/plain', t.id);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', function () { el.classList.remove('dragging'); });

    var late = t.status === 'progress' && urgency(t) === 'hot';
    var subs = t.subs || [];
    var isOpen = !!open[t.id];
    var toggleSubs = function () { open[t.id] = !open[t.id]; render(); };

    var when = h('span', { class: 'when' }, icon('cal'),
      parseYmd(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    if (t.time) {
      when.appendChild(icon('clock'));
      when.appendChild(document.createTextNode(dueDate(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })));
    }

    var acts = h('span', { class: 'acts' });
    MOVES[t.status].forEach(function (m) {
      acts.appendChild(ibtn(m[1], 'Move to ' + NAMES[m[0]], function () { moveTask(t.id, m[0]); }));
    });
    acts.appendChild(ibtn('subs', subs.length ? 'Show subtasks' : 'Add subtasks', toggleSubs, isOpen ? 'on' : ''));
    acts.appendChild(ibtn('edit', 'Edit', function () { openDialog(t); }));
    var armed = armedId === t.id;
    var del = ibtn('trash', armed ? 'Click again to delete' : 'Delete', function () { armDelete(t.id); }, armed ? 'armed' : '');
    if (armed) del.appendChild(h('span', { text: 'Sure?' }));
    acts.appendChild(del);

    el.appendChild(h('div', { class: 'title', text: t.title }));
    el.appendChild(h('div', { class: 'meta' },
      when,
      t.status === 'done' ? null : h('span', { class: 'rel' + (late ? ' late' : ''), text: rel(t) }),
      t.status === 'pending' && tone === 'hot' ? h('span', { class: 'tag', text: 'Emergency' }) : null,
      h('span', { class: 'spacer' }),
      acts
    ));

    if (subs.length) {
      var dn = subs.filter(function (s) { return s.status === 'done'; }).length;
      var ip = subs.filter(function (s) { return s.status === 'progress'; }).length;
      var fill = h('i');
      fill.style.width = Math.round(dn / subs.length * 100) + '%';
      el.appendChild(h('button', {
        type: 'button', class: 'subtoggle', 'aria-expanded': isOpen ? 'true' : 'false', onclick: toggleSubs
      },
        h('span', { class: 'caret', text: isOpen ? '▾' : '▸' }),
        h('span', { class: 'bar' }, fill),
        h('span', { class: 'n', text: dn + '/' + subs.length + (ip ? ' · ' + ip + ' active' : '') })
      ));
    }
    if (isOpen) {
      var box = h('div', { class: 'subs' });
      subs.forEach(function (s) {
        var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Subtask status' });
        [['pending', 'Pending'], ['progress', 'Doing'], ['done', 'Done']].forEach(function (o) {
          seg.appendChild(h('button', {
            type: 'button', class: 'segbtn sp-' + o[0], text: o[1],
            'aria-pressed': s.status === o[0] ? 'true' : 'false',
            onclick: function () { setSubStatus(t.id, s.id, o[0]); }
          }));
        });
        box.appendChild(h('div', { class: 'sub' + (s.status === 'done' ? ' is-done' : '') },
          h('span', { class: 'sub-title', text: s.title }),
          seg,
          h('button', { type: 'button', class: 'x', 'aria-label': 'Remove subtask', title: 'Remove subtask', text: '×', onclick: function () { removeSub(t.id, s.id); } })
        ));
      });
      var inp = h('input', { type: 'text', id: 'sa-' + t.id, placeholder: 'Add a subtask', maxlength: '120', autocomplete: 'off' });
      var submitSub = function () { var v = inp.value.trim(); if (v) addSub(t.id, v); };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitSub(); } });
      box.appendChild(h('div', { class: 'subadd' }, inp, h('button', { type: 'button', class: 'sbtn', text: 'Add', onclick: submitSub })));
      el.appendChild(box);
      if (!subs.length) setTimeout(function () { if (inp.isConnected && document.activeElement === document.body) inp.focus(); }, 0);
    }
    return el;
  }

  // ---- Daily practices ----
  var STATE_TEXT = { ok: 'On track', alert: 'Alert', emergency: 'Emergency', upcoming: 'Not started', ended: 'Finished' };
  var STATE_TONE = { ok: 'done', alert: 'need', emergency: 'hot', upcoming: 'ice', ended: 'ice' };

  function persistRoutines() {
    if (HAS_CHROME) { chrome.storage.local.set({ routines: routines }).catch(onWriteError); }
    else { try { localStorage.setItem(ROUTINE_KEY, JSON.stringify(routines)); } catch (e) { /* storage unavailable */ } }
  }
  function commitRoutine(r) {
    var i = routines.findIndex(function (x) { return x.id === r.id; });
    if (i >= 0) routines[i] = r; else routines.push(r);
    persistRoutines(); render();
  }
  function toggleToday(id) {
    var src = routines.find(function (x) { return x.id === id; }); if (!src) return;
    var r = clone(src), today = ymd(new Date());
    if (r.done.indexOf(today) >= 0) r.done = r.done.filter(function (d) { return d !== today; });
    else r.done.push(today);
    commitRoutine(r);
  }
  function armRoutineDelete(id) {
    clearTimeout(rArmTimer);
    if (rArmedId === id) {
      rArmedId = null;
      routines = routines.filter(function (x) { return x.id !== id; });
      persistRoutines(); render();
      return;
    }
    rArmedId = id;
    rArmTimer = setTimeout(function () { rArmedId = null; render(); }, 3000);
    render();
  }
  function fmtShort(day) { return parseYmd(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

  function renderPractice(now) {
    var today = ymd(now);
    var list = $('#practice-list');
    list.textContent = '';
    var todays = routines.filter(function (r) { return routineOn(r, today); })
      .sort(function (a, b) { return (a.created || 0) - (b.created || 0); });
    var doneN = 0;
    todays.forEach(function (r) {
      var st = routineStats(r, now);
      if (st.doneToday) doneN++;
      var tone = st.doneToday ? 'done' : st.state === 'ok' ? 'ice' : STATE_TONE[st.state];
      var b = h('button', {
        type: 'button', class: 'pchip t-' + tone + (st.doneToday ? ' is-done' : ''),
        'aria-pressed': st.doneToday ? 'true' : 'false',
        title: st.doneToday ? 'Done today. Click to undo.' : 'Mark done for today',
        onclick: function () { toggleToday(r.id); }
      }, h('span', { class: 'box' }, st.doneToday ? icon('check') : null), h('span', { class: 'pt', text: r.title }));
      if (st.streak) { var f = h('span', { class: 'streak' }, icon('flame'), String(st.streak)); b.appendChild(f); }
      list.appendChild(b);
    });
    if (!todays.length) {
      list.appendChild(h('span', { class: 'empty-inline', text: routines.length
        ? 'No practice scheduled for today.'
        : 'Add something you want to do every day, like exercise or reading. Check it off and it comes back tomorrow.' }));
    }
    $('#practice-n').textContent = todays.length ? doneN + ' of ' + todays.length + ' done today' : '';
  }

  function renderSide(now) {
    var list = $('#side-list');
    list.textContent = '';
    var order = { emergency: 0, alert: 1, ok: 2, upcoming: 3, ended: 4 };
    var rows = routines.map(function (r) { return { r: r, st: routineStats(r, now) }; })
      .sort(function (a, b) { return (order[a.st.state] - order[b.st.state]) || (b.st.missed - a.st.missed) || ((a.r.created || 0) - (b.r.created || 0)); });
    if (!rows.length) list.appendChild(h('div', { class: 'empty', text: 'Your daily practices and streaks show up here.' }));
    rows.forEach(function (o) {
      var r = o.r, st = o.st;
      var tone = STATE_TONE[st.state];
      var dots = h('div', { class: 'dots', 'aria-hidden': 'true' });
      var done = {};
      r.done.forEach(function (d) { done[d] = true; });
      for (var i = 13; i >= 0; i--) {
        var day = shiftYmd(st.today, -i);
        var cls = !routineOn(r, day) ? 'off' : done[day] ? 'yes' : i === 0 ? 'now' : 'no';
        dots.appendChild(h('i', { class: cls, title: fmtShort(day) }));
      }
      var stateLine = st.state === 'alert' || st.state === 'emergency'
        ? STATE_TEXT[st.state] + ': missed ' + st.missed + ' days'
        : st.state === 'upcoming' ? 'Starts ' + fmtShort(r.start)
        : STATE_TEXT[st.state];
      var armed = rArmedId === r.id;
      var del = ibtn('trash', armed ? 'Click again to delete' : 'Delete practice', function () { armRoutineDelete(r.id); }, armed ? 'armed' : '');
      if (armed) del.appendChild(h('span', { text: 'Sure?' }));
      list.appendChild(h('div', { class: 'rcard t-' + tone + (st.state === 'emergency' ? ' pulse' : '') },
        h('div', { class: 'rtop' },
          h('span', { class: 'rtitle', text: r.title }),
          h('span', { class: 'acts' }, ibtn('edit', 'Edit practice', function () { openRoutineDialog(r); }), del)
        ),
        h('div', { class: 'rstate', text: stateLine }),
        h('div', { class: 'rnums' },
          h('span', null, h('b', { text: String(st.streak) }), ' streak'),
          h('span', null, h('b', { text: String(st.best) }), ' best'),
          h('span', null, h('b', { text: String(st.total) }), ' total')
        ),
        dots,
        h('div', { class: 'rrange', text: fmtShort(r.start) + ' → ' + (r.end ? fmtShort(r.end) : 'no end') })
      ));
    });
  }

  function render() {
    var now = new Date();
    $('#today').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    var groups = {};
    LISTS.forEach(function (k) { groups[k] = []; });
    tasks.forEach(function (t) { if (groups[t.status]) groups[t.status].push(t); });

    LISTS.forEach(function (k) {
      var list = document.querySelector('[data-list="' + k + '"]');
      list.textContent = '';
      var arr = groups[k].sort(function (a, b) { return (dueDate(a) - dueDate(b)) || ((a.created || 0) - (b.created || 0)); });
      if (!arr.length) list.appendChild(h('div', { class: 'empty', text: loading ? 'Loading tasks.' : EMPTY[k] }));
      arr.forEach(function (t) { list.appendChild(card(t)); });
      document.querySelector('[data-count="' + k + '"]').textContent = arr.length;
    });

    var hot = 0, over = 0;
    tasks.forEach(function (t) {
      if (t.status === 'pending' || t.status === 'progress') {
        if (urgency(t) === 'hot') hot++;
        if (dueDate(t) < now) over++;
      }
    });
    var sum = $('#summary');
    sum.textContent = '';
    sum.appendChild(h('span', { class: 'pill t-hot', text: hot + ' in emergency' }));
    if (over) sum.appendChild(h('span', { class: 'pill t-hot', text: over + ' overdue' }));
    sum.appendChild(h('span', { class: 'pill t-safe', text: groups.progress.length + ' in progress' }));

    var rAlert = 0, rEmerg = 0;
    routines.forEach(function (r) {
      var st = routineStats(r, now).state;
      if (st === 'emergency') rEmerg++; else if (st === 'alert') rAlert++;
    });
    if (rEmerg) sum.appendChild(h('span', { class: 'pill t-hot', text: rEmerg + (rEmerg === 1 ? ' practice' : ' practices') + ' in emergency' }));
    if (rAlert) sum.appendChild(h('span', { class: 'pill t-need', text: rAlert + (rAlert === 1 ? ' practice' : ' practices') + ' slipping' }));

    renderPractice(now);
    renderSide(now);
    renderSchedule(now);

    $('#sample-note').hidden = !tasks.some(function (t) { return t.sample; });
  }

  // Streaks stay next to Practices; the sidebar is reserved for time bookings.
  function toggleStreaks(show) {
    $('#streak-panel').hidden = !show;
    $('#toggle-streaks').setAttribute('aria-expanded', String(show));
  }
  $('#toggle-streaks').addEventListener('click', function () { toggleStreaks($('#streak-panel').hidden); });
  $('#close-streaks').addEventListener('click', function () { toggleStreaks(false); $('#toggle-streaks').focus(); });

  var scheduleDate = $('#schedule-date');
  var scheduleFollowsToday = true;
  scheduleDate.value = ymd(new Date());
  scheduleDate.addEventListener('change', function () {
    if (!scheduleDate.value) scheduleDate.value = ymd(new Date());
    scheduleFollowsToday = scheduleDate.value === ymd(new Date());
    renderSchedule(new Date());
    $('#timeline').parentElement.scrollTop = 0;
  });
  $('#schedule-today').addEventListener('click', function () {
    scheduleFollowsToday = true;
    renderSchedule(new Date());
    $('#timeline').parentElement.scrollTop = 0;
  });
  function clockLabel(date) { return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function bookingLabel(b) {
    var range = bookingRange(b);
    return clockLabel(range.start) + ' – ' + clockLabel(range.end) + (ymd(range.start) !== ymd(range.end) ? ' (next day)' : '');
  }
  var lastScheduleWindow = '';
  function renderSchedule(now) {
    if (scheduleFollowsToday) scheduleDate.value = ymd(now);
    var day = scheduleDate.value;
    var firstHour = day === ymd(now) ? now.getHours() : 0;
    var windowKey = day + ':' + firstHour;
    var timeline = $('#timeline');
    timeline.textContent = '';
    timeline.style.height = ((24 - firstHour) * 120) + 'px';
    var start = parseYmd(day), end = parseYmd(shiftYmd(day, 1));
    start.setHours(firstHour);
    for (var hour = firstHour; hour < 24; hour++) {
      (function (hour) {
        var labelDate = parseYmd(day); labelDate.setHours(hour);
        var row = h('div', { class: 'hour-row' });
        row.style.top = ((hour - firstHour) * 120) + 'px';
        row.appendChild(h('span', { class: 'hour-label', text: pad(hour) + ':00' }));
        row.appendChild(h('button', { type: 'button', class: 'hour-add', 'aria-label': 'Book time at ' + clockLabel(labelDate),
          onclick: function () { if (bookingsLoaded) openBooking(null, pad(hour) + ':00'); } }));
        timeline.appendChild(row);
      })(hour);
    }
    var visible = bookings.filter(function (b) { var r = bookingRange(b); return r.start < end && r.end > start; })
      .sort(function (a, b) { return bookingRange(a).start - bookingRange(b).start; });
    visible.forEach(function (b) {
      var range = bookingRange(b);
      var from = new Date(Math.max(start.getTime(), range.start.getTime()));
      var to = new Date(Math.min(end.getTime(), range.end.getTime()));
      var fromMinute = from.getHours() * 60 + from.getMinutes() - firstHour * 60;
      var toMinute = to.getTime() === end.getTime() ? (24 - firstHour) * 60 : to.getHours() * 60 + to.getMinutes() - firstHour * 60;
      var label = b.title + ' · ' + bookingLabel(b) + (b.done ? ' · Completed' : '');
      var block = h('button', { type: 'button', class: 'time-booking' + (b.done ? ' is-done' : ''),
        title: label, 'aria-label': label + '. Click to edit.', onclick: function () { openBooking(b); } },
        h('strong', { text: (b.done ? '✓ ' : '') + b.title }), h('span', { text: bookingLabel(b) }));
      block.style.top = (fromMinute * 2) + 'px';
      block.style.height = Math.max(2, (toMinute - fromMinute) * 2 - 1) + 'px';
      timeline.appendChild(block);
    });
    if (day === ymd(now)) {
      var line = h('div', { class: 'now-line', title: 'Now · ' + clockLabel(now) });
      line.style.top = (now.getMinutes() * 2) + 'px';
      timeline.appendChild(line);
    }
    $('#schedule-summary').textContent = !bookingsLoaded ? 'Loading your schedule.' :
      (visible.length ? visible.length + (visible.length === 1 ? ' booking' : ' bookings') + '. ' : 'No bookings yet. ') +
      (day === ymd(now) ? 'Current hour first · through 23:00.' : 'Full day · 00:00–23:00.') + ' Click an hour to book.';
    if (windowKey !== lastScheduleWindow) timeline.parentElement.scrollTop = 0;
    lastScheduleWindow = windowKey;
  }

  var bookingsLoaded = false, bookingEditingId = null, bookingOpener = null;
  var bookingOverlay = $('#booking-overlay'), bookingForm = $('#booking-form');
  function persistBookings() {
    if (HAS_CHROME) chrome.storage.local.set({ bookings: bookings }).catch(onWriteError);
    else { try { localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings)); } catch (e) { onWriteError(); } }
  }
  function openBooking(b, time) {
    bookingOpener = document.activeElement;
    bookingEditingId = b ? b.id : null;
    bookingForm.reset();
    $('#booking-title').value = b ? b.title : '';
    $('#booking-date').value = b ? b.date : scheduleDate.value;
    var now = new Date();
    $('#booking-time').value = b ? b.time : time || (scheduleDate.value === ymd(now) ? pad(now.getHours()) + ':' + pad(now.getMinutes()) : '09:00');
    $('#booking-hours').value = b ? Math.floor(b.duration / 60) : 1;
    $('#booking-minutes').value = b ? b.duration % 60 : 0;
    $('#booking-done').checked = !!(b && b.done);
    $('#booking-delete').hidden = !b;
    $('#booking-delete').textContent = 'Delete';
    $('#booking-heading').textContent = b ? 'Edit booking' : 'Book time';
    $('#booking-msg').textContent = '';
    updateBookingPreview();
    bookingOverlay.hidden = false;
    $('#booking-title').focus();
  }
  function closeBooking() {
    bookingOverlay.hidden = true;
    bookingEditingId = null;
    if (bookingOpener && bookingOpener.isConnected) bookingOpener.focus();
    else $('#open-booking').focus();
  }
  function bookingValues() {
    return { id: bookingEditingId || uid(), title: $('#booking-title').value.trim(), date: $('#booking-date').value,
      time: $('#booking-time').value, duration: Number($('#booking-hours').value) * 60 + Number($('#booking-minutes').value), done: $('#booking-done').checked };
  }
  function validBookingTime(b) {
    var hours = $('#booking-hours'), minutes = $('#booking-minutes');
    return b.date && b.time && hours.value !== '' && minutes.value !== '' && hours.validity.valid && minutes.validity.valid && b.duration > 0 && b.duration <= 1440;
  }
  function updateBookingPreview() {
    var b = bookingValues();
    $('#booking-preview').textContent = validBookingTime(b) ? bookingLabel(b) + ' · ' + b.duration + ' minutes blocked' : 'Choose a start time and a duration of 1 minute to 24 hours.';
  }
  bookingForm.addEventListener('input', updateBookingPreview);
  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var b = bookingValues();
    if (!b.title) { $('#booking-msg').textContent = 'Give the task or event a name.'; return $('#booking-title').focus(); }
    if (!validBookingTime(b)) { $('#booking-msg').textContent = 'Choose a date, start time, and duration between 1 minute and 24 hours.'; return; }
    var conflict = bookingConflict(b, bookings);
    if (conflict) { $('#booking-msg').textContent = 'This overlaps with “' + conflict.title + '” (' + bookingLabel(conflict) + '). Choose a free time.'; return; }
    var i = bookings.findIndex(function (item) { return item.id === b.id; });
    if (i >= 0) bookings[i] = b; else bookings.push(b);
    scheduleDate.value = b.date;
    scheduleFollowsToday = b.date === ymd(new Date());
    persistBookings(); renderSchedule(new Date()); closeBooking();
  });
  $('#open-booking').addEventListener('click', function () { openBooking(null); });
  $('#booking-cancel').addEventListener('click', closeBooking);
  $('#booking-delete').addEventListener('click', function () {
    if (this.textContent !== 'Delete again?') { this.textContent = 'Delete again?'; return; }
    bookings = bookings.filter(function (b) { return b.id !== bookingEditingId; });
    persistBookings(); renderSchedule(new Date()); closeBooking();
  });
  bookingOverlay.addEventListener('mousedown', function (e) { if (e.target === bookingOverlay) closeBooking(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !bookingOverlay.hidden) closeBooking();
    // Keep keyboard navigation within whichever dialog is open.
    if (e.key !== 'Tab') return;
    var activeOverlay = document.querySelector('.overlay:not([hidden])');
    if (!activeOverlay) return;
    var controls = Array.from(activeOverlay.querySelectorAll('button, input, select, textarea')).filter(function (el) { return !el.disabled && el.getClientRects().length; });
    var first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Add and edit dialog
  var overlay = $('#overlay'), form = $('#task-form'), fTitle = $('#f-title'), fDate = $('#f-date'), fTime = $('#f-time'),
      fStatus = $('#f-status'), fSubs = $('#f-subs'), subsWrap = $('#f-subs-wrap'), msg = $('#form-msg'),
      btn = $('#f-submit'), dlgTitle = $('#dlg-title');

  function openDialog(t) {
    opener = document.activeElement;
    form.reset();
    msg.textContent = '';
    if (t) {
      editingId = t.id;
      fTitle.value = t.title; fDate.value = t.date; fTime.value = t.time || ''; fStatus.value = t.status;
      subsWrap.hidden = true;
      btn.textContent = 'Save changes'; dlgTitle.textContent = 'Edit task';
    } else {
      editingId = null;
      subsWrap.hidden = false;
      btn.textContent = 'Add task'; dlgTitle.textContent = 'Add a task';
    }
    overlay.hidden = false;
    fTitle.focus();
  }
  function closeDialog() {
    overlay.hidden = true;
    editingId = null;
    if (opener && opener.isConnected) opener.focus();
  }
  function fail(text, el) { msg.textContent = text; el.focus(); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = fTitle.value.trim();
    if (!title) return fail('Give the task a name.', fTitle);
    if (!fDate.value) return fail('Pick a deadline date. Every task needs one.', fDate);
    if (editingId) {
      var src = findTask(editingId);
      if (src) {
        var t = clone(src);
        t.title = title; t.date = fDate.value; t.time = fTime.value; t.status = fStatus.value; t.sample = false;
        if (t.status === 'done') t.subs.forEach(function (s) { s.status = 'done'; });
        commit(t);
      }
    } else {
      var isDone = fStatus.value === 'done';
      var subs = fSubs.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 30)
        .map(function (s) { return { id: uid(), title: s.slice(0, 120), status: isDone ? 'done' : 'pending' }; });
      commit({ id: uid(), title: title, date: fDate.value, time: fTime.value, status: fStatus.value, sample: false, created: Date.now(), subs: subs });
    }
    closeDialog();
  });

  $('#open-add').addEventListener('click', function () { openDialog(null); });
  $('#f-cancel').addEventListener('click', closeDialog);
  overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeDialog(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closeDialog(); });
  $('#quick').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'clear-time') { fTime.value = ''; return; }
    if (b.dataset.offset != null) { fDate.value = ymd(addDays(+b.dataset.offset)); msg.textContent = ''; }
  });
  $('#remove-samples').addEventListener('click', removeSamples);

  // Daily practice dialog
  var rOverlay = $('#r-overlay'), rForm = $('#routine-form'), rTitle = $('#r-title'), rStart = $('#r-start'), rEnd = $('#r-end'),
      rMsg = $('#r-msg'), rBtn = $('#r-submit'), rDlgTitle = $('#r-dlg-title');
  function openRoutineDialog(r) {
    opener = document.activeElement;
    rForm.reset();
    rMsg.textContent = '';
    rEditingId = r ? r.id : null;
    rTitle.value = r ? r.title : '';
    rStart.value = r ? r.start : ymd(new Date());
    rEnd.value = r && r.end ? r.end : '';
    rBtn.textContent = r ? 'Save changes' : 'Add practice';
    rDlgTitle.textContent = r ? 'Edit daily practice' : 'Add a daily practice';
    rOverlay.hidden = false;
    rTitle.focus();
  }
  function closeRoutineDialog() {
    rOverlay.hidden = true;
    rEditingId = null;
    if (opener && opener.isConnected) opener.focus();
  }
  rForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = rTitle.value.trim();
    if (!title) { rMsg.textContent = 'Give the practice a name.'; return rTitle.focus(); }
    if (!rStart.value) { rMsg.textContent = 'Pick the day it starts.'; return rStart.focus(); }
    if (rEnd.value && rEnd.value < rStart.value) { rMsg.textContent = 'The end date has to be on or after the start date.'; return rEnd.focus(); }
    var src = rEditingId && routines.find(function (x) { return x.id === rEditingId; });
    var r = src ? clone(src) : { id: uid(), created: Date.now(), done: [] };
    r.title = title; r.start = rStart.value; r.end = rEnd.value || '';
    commitRoutine(r);
    closeRoutineDialog();
  });
  $('#open-routine').addEventListener('click', function () { openRoutineDialog(null); });
  $('#r-cancel').addEventListener('click', closeRoutineDialog);
  rOverlay.addEventListener('mousedown', function (e) { if (e.target === rOverlay) closeRoutineDialog(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !rOverlay.hidden) closeRoutineDialog(); });

  // Drag and drop between columns
  document.querySelectorAll('.col').forEach(function (c) {
    c.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; c.classList.add('over'); });
    c.addEventListener('dragleave', function (e) { if (!c.contains(e.relatedTarget)) c.classList.remove('over'); });
    c.addEventListener('drop', function (e) {
      e.preventDefault();
      c.classList.remove('over');
      var id = e.dataTransfer.getData('text/plain');
      if (id) moveTask(id, c.dataset.status);
    });
  });

  function seed() {
    function mk(title, off, time, status, subs) {
      return {
        id: uid(), title: title, date: ymd(addDays(off)), time: time || '', status: status, sample: true, created: Date.now(),
        subs: (subs || []).map(function (s) { return { id: uid(), title: s[0], status: s[1] }; })
      };
    }
    return [
      mk('Submit quarterly tax filing', 1, '17:00', 'pending'),
      mk('Prepare client proposal', 2, '', 'pending', [['Gather requirements', 'pending'], ['Draft pricing', 'pending'], ['Review with team', 'pending']]),
      mk('Fix invoice error for Acme', -1, '', 'pending'),
      mk('Write monthly report', 5, '', 'pending'),
      mk('Renew passport', 9, '', 'pending'),
      mk('Book conference travel', 14, '', 'pending'),
      mk('Review pull request backlog', 3, '18:00', 'progress'),
      mk('Draft launch blog post', 6, '', 'progress', [['Outline', 'done'], ['First draft', 'progress'], ['Edit and proofread', 'pending'], ['Publish', 'pending']]),
      mk('Learn a new framework', 30, '', 'icebox'),
      mk('Plan portfolio redesign', 45, '', 'icebox'),
      mk('Pay rent', -2, '', 'done'),
      mk('Send weekly team update', -1, '09:00', 'done', [['Collect updates', 'done'], ['Write summary', 'done']])
    ];
  }

  function readTasks() {
    if (HAS_CHROME) return chrome.storage.local.get('tasks').then(function (r) { return r.tasks; });
    var raw = null;
    try { raw = localStorage.getItem(LOCAL_KEY); } catch (e) { /* ignore */ }
    try { return Promise.resolve(raw ? JSON.parse(raw) : undefined); } catch (e) { return Promise.resolve(undefined); }
  }

  function readRoutines() {
    if (HAS_CHROME) return chrome.storage.local.get('routines').then(function (r) { return r.routines; });
    try { return Promise.resolve(JSON.parse(localStorage.getItem(ROUTINE_KEY) || '[]')); } catch (e) { return Promise.resolve([]); }
  }
  function normRoutine(r) { if (!Array.isArray(r.done)) r.done = []; return r; }

  function init() {
    var readBookings;
    if (HAS_CHROME) readBookings = chrome.storage.local.get('bookings').then(function (r) { return r.bookings; });
    else {
      try { readBookings = Promise.resolve(JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]')); }
      catch (e) { readBookings = Promise.reject(e); }
    }
    readBookings.then(function (arr) {
      bookings = Array.isArray(arr) ? arr : [];
      bookingsLoaded = true;
      $('#open-booking').disabled = false;
      renderSchedule(new Date());
    }).catch(function () { $('#schedule-summary').textContent = 'Could not load your schedule. Reload to try again.'; });
    readRoutines().then(function (arr) { routines = (arr || []).map(normRoutine); render(); }).catch(function () { /* keep empty */ });
    render();
    readTasks().then(function (arr) {
      if (Array.isArray(arr)) { tasks = arr.map(normSubs); }
      else { tasks = seed(); persistLocal(); }
      loading = false;
      setSync('Saved in this browser. Reminders appear as Chrome notifications while Chrome is open.');
      render();
    }).catch(function () {
      loading = false;
      setSync('Could not read saved tasks. Reload the page to try again.', true);
      render();
    });
    if (HAS_CHROME) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (changes.tasks) tasks = (changes.tasks.newValue || []).map(normSubs);
        if (changes.routines) routines = (changes.routines.newValue || []).map(normRoutine);
        if (changes.bookings) bookings = changes.bookings.newValue || [];
        if (changes.tasks || changes.routines || changes.bookings) render();
      });
    }
  }

  init();
  setInterval(render, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
})();
