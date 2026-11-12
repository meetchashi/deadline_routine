import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const logic = vm.createContext({});
vm.runInContext(readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), logic);
const { taskProgress, taskTimeRemaining, syncFromCount, syncFromSubs, setTaskStatus } = logic;
const count = { subtaskMode: 'count', subtaskTotal: 75, subtaskCompleted: 25, status: 'pending' };
assert(Math.abs(taskProgress(count).percent - 100 / 3) < 1e-10);
syncFromCount(count);
assert.equal(count.status, 'progress');
count.subtaskCompleted = 75;
syncFromCount(count);
assert.equal(count.status, 'done');
count.subtaskTotal = 100;
syncFromCount(count);
assert.equal(count.status, 'progress');
setTaskStatus(count, 'done');
assert.equal(count.subtaskCompleted, 100);
setTaskStatus(count, 'progress');
assert.equal(count.subtaskCompleted, 0);
assert.equal(taskProgress({ subtaskMode: 'count' }).total, 1);
assert.equal(taskProgress({ subtaskMode: 'count' }).completed, 0);

const checklist = { subs: Array.from({ length: 75 }, (_, i) => ({ status: i < 25 ? 'done' : 'pending' })), status: 'pending' };
assert(Math.abs(taskProgress(checklist).percent - 100 / 3) < 1e-10);
setTaskStatus(checklist, 'done');
assert.equal(taskProgress(checklist).percent, 100);
setTaskStatus(checklist, 'pending');
assert.equal(taskProgress(checklist).completed, 0);
checklist.subs.forEach(s => { s.status = 'done'; });
syncFromSubs(checklist);
assert.equal(checklist.status, 'done');
assert.equal(taskProgress({ status: 'pending', subs: [] }).percent, 0);
assert.equal(taskProgress({ status: 'done', subs: [] }).percent, 100);

// Local wall-clock timestamps match the date/time fields in the board.
const task = { date: '2026-11-15', time: '23:00', created: new Date(2026, 10, 15, 21).getTime() };
assert.equal(taskTimeRemaining(task, new Date(2026, 10, 15, 21)).percent, 100);
assert.equal(taskTimeRemaining(task, new Date(2026, 10, 15, 22)).percent, 50);
assert.equal(taskTimeRemaining(task, new Date(2026, 10, 15, 22)).hours, 1);
assert.equal(taskTimeRemaining(task, new Date(2026, 10, 15, 22, 30)).percent, 25);
assert.equal(taskTimeRemaining(task, new Date(2026, 10, 15, 23)).percent, 0);
assert.equal(taskTimeRemaining(task, new Date(2026, 10, 16)).hours, 0);
assert.equal(taskTimeRemaining(task, new Date(2026, 10, 15, 20)).percent, 100);
assert.equal(taskTimeRemaining({ ...task, created: new Date(2026, 10, 16).getTime() }).percent, 0);
assert.equal(taskTimeRemaining({ ...task, created: undefined }).hasStart, false);
assert.equal(taskTimeRemaining({ ...task, time: '' }, new Date(2026, 10, 15, 22, 59)).hours, 1);
console.log('Passed: subtask counts, checklist completion, reopening, and hourly countdown boundaries.');
