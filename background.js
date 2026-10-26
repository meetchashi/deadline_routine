/* Deadline Board background worker: toolbar button, urgent-task badge, reminders. */
importScripts('logic.js');

const BOARD_URL = chrome.runtime.getURL('board.html');

async function openBoard() {
  try {
    const ctxs = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [BOARD_URL] });
    if (ctxs.length && ctxs[0].tabId >= 0) {
      await chrome.tabs.update(ctxs[0].tabId, { active: true });
      await chrome.windows.update(ctxs[0].windowId, { focused: true });
      return;
    }
  } catch (e) { /* fall through and open a new tab */ }
  await chrome.tabs.create({ url: BOARD_URL });
}

function ensureAlarm() {
  chrome.alarms.get('tick', function (a) {
    if (!a) chrome.alarms.create('tick', { periodInMinutes: 1 });
  });
}

async function tick() {
  const data = await chrome.storage.local.get(['tasks', 'sent', 'routines']);
  const tasks = (data.tasks || []).filter(function (t) { return !t.sample; });
  const routines = data.routines || [];
  const sent = data.sent || {};
  const now = new Date();

  const hot = tasks.filter(function (t) { return isActive(t) && urgency(t) === 'hot'; }).length +
    routines.filter(function (r) { return routineStats(r, now).state === 'emergency'; }).length;
  chrome.action.setBadgeText({ text: hot ? String(hot) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#C62828' });

  const plan = planReminders(tasks, now, sent, routines);
  if (!plan.length) return;
  for (const r of plan) {
    sent[r.key] = Date.now();
    if (!r.silent) {
      chrome.notifications.create(r.id + '-' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: r.title,
        message: r.message,
        priority: 2
      });
    }
  }
  const cutoff = Date.now() - 7 * 864e5;
  Object.keys(sent).forEach(function (k) { if (sent[k] < cutoff) delete sent[k]; });
  await chrome.storage.local.set({ sent: sent });
}

chrome.runtime.onInstalled.addListener(function (details) {
  ensureAlarm();
  tick();
  if (details.reason === 'install') openBoard();
});
chrome.runtime.onStartup.addListener(function () { ensureAlarm(); tick(); });
chrome.alarms.onAlarm.addListener(function (alarm) { if (alarm.name === 'tick') tick(); });
chrome.storage.onChanged.addListener(function (changes, area) { if (area === 'local' && (changes.tasks || changes.routines)) tick(); });
chrome.action.onClicked.addListener(function () { openBoard(); });
chrome.notifications.onClicked.addListener(function (id) { chrome.notifications.clear(id); openBoard(); });

ensureAlarm();
