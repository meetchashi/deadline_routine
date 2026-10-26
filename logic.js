/* Shared date and urgency rules, used by the board page and the background worker. */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function addDays(n) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
// A deadline with no time counts as the end of that day.
function dueDate(t) {
  var d = parseYmd(t.date);
  if (t.time) { var q = t.time.split(':'); d.setHours(+q[0], +q[1], 0, 0); }
  else { d.setHours(23, 59, 0, 0); }
  return d;
}
// Calendar days from today to the deadline date (negative when past).
function dayDiff(t) {
  var a = parseYmd(t.date), b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 864e5);
}
function urgency(t) {
  var n = dayDiff(t);
  if (dueDate(t) < new Date() || n <= 3) return 'hot';
  if (n <= 7) return 'need';
  return 'safe';
}
function rel(t) {
  var now = new Date(), due = dueDate(t), n = dayDiff(t);
  if (due < now) {
    if (n < 0) { var d = -n; return 'Overdue by ' + d + (d === 1 ? ' day' : ' days'); }
    return 'Overdue by ' + Math.max(1, Math.floor((now - due) / 36e5)) + 'h';
  }
  if (n === 0) {
    if (t.time) {
      var m = Math.round((due - now) / 6e4);
      if (m < 60) return 'in ' + m + 'm';
      if (m < 180) return 'in ' + Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
    }
    return 'Due today';
  }
  if (n === 1) return 'Tomorrow';
  return 'in ' + n + ' days';
}
// Keeps a task's column in step with its subtasks (each is pending, progress or done).
function syncFromSubs(t) {
  var n = t.subs.length;
  if (!n) return;
  var done = t.subs.filter(function (s) { return s.status === 'done'; }).length;
  var prog = t.subs.filter(function (s) { return s.status === 'progress'; }).length;
  if (done === n) t.status = 'done';
  else if (prog > 0) t.status = 'progress';
  else if (t.status === 'done') t.status = 'progress';
  else if (done > 0 && (t.status === 'icebox' || t.status === 'pending')) t.status = 'progress';
}

// ---- Reminder settings (edit these two numbers, then reload the extension) ----
var DIGEST_HOUR = 9;      // morning digest of urgent tasks, local time
var LEAD_MINUTES = 60;    // reminder this many minutes before a timed deadline

function isActive(t) { return t.status === 'pending' || t.status === 'progress'; }

// ---- Daily practices: repeat every day from start until end (end is optional) ----
var PRACTICE_ALERT_DAYS = 3;      // missed this many days in a row -> alert
var PRACTICE_EMERGENCY_DAYS = 7;  // missed this many days in a row -> emergency

function shiftYmd(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function routineOn(r, day) { return day >= r.start && (!r.end || day <= r.end); }
// Streak, best run, missed-in-a-row and state for one practice. Dates are YYYY-MM-DD strings.
function routineStats(r, now) {
  var today = ymd(now || new Date());
  var done = {};
  (r.done || []).forEach(function (x) { done[x] = true; });
  var streak = 0, d = done[today] ? today : shiftYmd(today, -1);
  while (d >= r.start && done[d]) { streak++; d = shiftYmd(d, -1); }
  // Today only counts as missed once it is over, and checking today clears the run.
  var missed = 0;
  if (!done[today]) {
    d = shiftYmd(today, -1);
    if (r.end && r.end < d) d = r.end;
    while (d >= r.start && !done[d]) { missed++; d = shiftYmd(d, -1); }
  }
  var best = 0, run = 0, prev = null;
  Object.keys(done).sort().forEach(function (x) {
    run = prev && shiftYmd(prev, 1) === x ? run + 1 : 1;
    prev = x;
    if (run > best) best = run;
  });
  var state = today < r.start ? 'upcoming'
    : r.end && today > r.end ? 'ended'
    : missed >= PRACTICE_EMERGENCY_DAYS ? 'emergency'
    : missed >= PRACTICE_ALERT_DAYS ? 'alert' : 'ok';
  return { today: today, doneToday: !!done[today], streak: streak, best: best, total: Object.keys(done).length, missed: missed, state: state };
}

// Decides which notifications are due right now. `sent` remembers what already fired.
function planReminders(tasks, now, sent, routines) {
  var out = [];
  var live = tasks.filter(function (t) { return !t.sample && isActive(t); });

  live.forEach(function (t) {
    if (!t.time) return;
    var mins = Math.round((dueDate(t) - now) / 6e4);
    var key = 'lead:' + t.id + ':' + t.date + 'T' + t.time;
    if (mins > 0 && mins <= LEAD_MINUTES && !sent[key]) {
      out.push({ key: key, id: 'lead-' + t.id, title: 'Due in ' + mins + (mins === 1 ? ' minute' : ' minutes'), message: t.title });
    }
  });

  if (now.getHours() >= DIGEST_HOUR) {
    var dkey = 'digest:' + ymd(now);
    if (!sent[dkey]) {
      var hot = live.filter(function (t) { return urgency(t) === 'hot'; })
        .sort(function (a, b) { return dueDate(a) - dueDate(b); });
      if (hot.length) {
        out.push({
          key: dkey, id: 'digest',
          title: hot.length + (hot.length === 1 ? ' task needs' : ' tasks need') + ' attention',
          message: hot.slice(0, 5).map(function (t) { return t.title + ' (' + rel(t) + ')'; }).join('\n')
        });
      } else {
        out.push({ key: dkey, silent: true });
      }
    }
    (routines || []).forEach(function (r) {
      var st = routineStats(r, now);
      if (st.state !== 'alert' && st.state !== 'emergency') return;
      var rkey = 'practice:' + r.id + ':' + ymd(now);
      if (sent[rkey]) return;
      out.push({
        key: rkey, id: 'practice-' + r.id,
        title: (st.state === 'emergency' ? 'Emergency: ' : 'Practice slipping: ') + r.title,
        message: 'Missed ' + st.missed + ' days in a row. Check it off today to restart your streak.'
      });
    });
  }
  return out;
}

// Schedule bookings use full local timestamps so overlaps across midnight are caught.
function bookingRange(b) {
  var start = parseYmd(b.date), parts = b.time.split(':');
  start.setHours(+parts[0], +parts[1], 0, 0);
  return { start: start, end: new Date(start.getTime() + b.duration * 60000) };
}
function bookingConflict(candidate, bookings) {
  var range = bookingRange(candidate);
  return bookings.find(function (b) {
    if (b.id === candidate.id) return false;
    var other = bookingRange(b);
    return range.start < other.end && range.end > other.start;
  });
}
