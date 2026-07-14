import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function boot() {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script, 'inline game script should exist');

  const handlers = {};
  const canvasHandlers = {};
  const context2d = new Proxy({
    measureText(value) { return { width: String(value).length * 9 }; },
    fillRect() {}, clearRect() {}, beginPath() {}, closePath() {}, roundRect() {}, arc() {}, ellipse() {}, bezierCurveTo() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, fillText() {}, save() {}, restore() {}, clip() {}, translate() {}, scale() {}
  }, { set(target, property, value) { target[property] = value; return true; } });
  const canvas = {
    width: 600, height: 900,
    getContext() { return context2d; },
    addEventListener(type, fn) { canvasHandlers[type] = fn; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 900 }; },
    requestFullscreen() {}
  };
  const landscapeButton = { textContent: '', addEventListener() {} };
  const storage = new Map();
  const document = { querySelector(selector) { return selector === '#game' ? canvas : landscapeButton; }, documentElement: { requestFullscreen() { return Promise.resolve(); } }, fullscreenElement: null, exitFullscreen() {} };
  const sandbox = {
    console, document, navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    localStorage: { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } },
    matchMedia() { return { matches: false }; }, screen: { orientation: { lock() { return Promise.resolve(); } } }, setInterval() {}, Intl, Math, Date, JSON
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (type, fn) => { handlers[type] = fn; };
  vm.runInNewContext(script, sandbox, { filename: 'index.html' });

  const key = (value) => handlers.keydown({ key: value, preventDefault() {} });
  const advance = (ms) => sandbox.advanceTime(ms);
  const state = () => JSON.parse(sandbox.render_game_to_text());
  return { key, advance, state, storage, click: (x, y) => canvasHandlers.pointerup({ clientX: x, clientY: y }) };
}

function startToLogic(game) {
  game.key('Enter');
  game.advance(1500);
  assert.equal(game.state().mode, 'ready');
  assert.equal(game.state().roomType, 'logic');
  game.key('Enter');
  assert.equal(game.state().mode, 'room');
}

function passLogic(game) {
  ['1', '4', '2', '3', 'Enter'].forEach(game.key);
  assert.equal(game.state().mode, 'success');
  assert.deepEqual(game.state().collected, ['logic']);
  game.advance(2700); game.advance(1500);
  assert.equal(game.state().mode, 'ready');
  assert.equal(game.state().roomType, 'memory');
  game.key('Enter');
}

function passMemory(game) {
  game.advance(3100);
  ['1', '3', '2', '4'].forEach(game.key);
  game.advance(900); game.advance(4400);
  ['1', '3', '2', '4', '3', '1'].forEach(game.key);
  game.advance(2700); game.advance(1500);
  assert.equal(game.state().mode, 'ready');
  assert.equal(game.state().roomType, 'trivia');
  game.key('Enter');
}

function passTrivia(game) {
  ['2', '1', '3', '4'].forEach(game.key);
  game.advance(2700); game.advance(1500);
  assert.equal(game.state().mode, 'ready');
  assert.equal(game.state().roomType, 'platformer');
  game.key('Enter');
}

function passPlatformer(game) {
  game.advance(3100);
  for (const time of [2500,5500,8500,11500,14500,17500,20500,23500,26500]) {
    const current = game.state().puzzle.elapsedMs;
    game.advance(Math.max(0, time - current - 400));
    game.key(' ');
    game.advance(450);
  }
  const remaining = 30000 - game.state().puzzle.elapsedMs + 50;
  game.advance(Math.max(0, remaining));
  game.advance(2700); game.advance(1500);
  assert.equal(game.state().mode, 'ready');
  assert.equal(game.state().roomType, 'finale');
  game.key('Enter');
}

function passFinale(game) {
  game.key('2');
  ['1', '2', '3', 'Enter'].forEach(game.key);
  ['1', '3', '2'].forEach(game.key);
  game.advance(1350); game.key(' ');
  game.advance(2700);
}

function passDayOne(game) {
  startToLogic(game); passLogic(game); passMemory(game); passTrivia(game); passPlatformer(game); passFinale(game);
}

const success = boot();
passDayOne(success);
assert.equal(success.state().mode, 'victory');
assert.equal(success.state().score, 5);
assert.deepEqual(success.state().results, [true, true, true, true, true]);

const failure = boot();
startToLogic(failure);
['1', '2', '3', '4', 'Enter'].forEach(failure.key);
assert.equal(failure.state().mode, 'fail');
assert.equal(failure.state().character.animation, 'burn');
failure.advance(1600);
assert.equal(failure.state().mode, 'gameover');
failure.key('Enter');
assert.equal(failure.state().attempt, 2);
assert.equal(failure.state().official, false);

const transitionTiming = boot();
startToLogic(transitionTiming);
['1', '4', '2', '3', 'Enter'].forEach(transitionTiming.key);
transitionTiming.advance(2500);
assert.equal(transitionTiming.state().mode, 'success');
transitionTiming.advance(100); transitionTiming.advance(1200);
assert.equal(transitionTiming.state().mode, 'transition');
assert.deepEqual(transitionTiming.state().character.carrying, ['logic']);
transitionTiming.advance(250);
assert.equal(transitionTiming.state().mode, 'ready');

const memoryFailure = boot();
startToLogic(memoryFailure); passLogic(memoryFailure); memoryFailure.advance(3100); memoryFailure.key('2');
assert.equal(memoryFailure.state().character.animation, 'shadow');

const memoryReplay = boot();
startToLogic(memoryReplay); passLogic(memoryReplay); memoryReplay.advance(3100);
memoryReplay.click(300, 750);
assert.equal(memoryReplay.state().puzzle.phase, 'show');
assert.equal(memoryReplay.state().puzzle.replayAvailable, false);
memoryReplay.advance(3100); memoryReplay.click(300, 750);
assert.equal(memoryReplay.state().puzzle.phase, 'input');
memoryReplay.click(150, 480);
assert.equal(memoryReplay.state().puzzle.inputLength, 1);

const triviaFailure = boot();
startToLogic(triviaFailure); passLogic(triviaFailure); passMemory(triviaFailure); triviaFailure.key('1');
assert.equal(triviaFailure.state().character.animation, 'fall');

const platformerFailure = boot();
startToLogic(platformerFailure); passLogic(platformerFailure); passMemory(platformerFailure); passTrivia(platformerFailure); platformerFailure.advance(3100); platformerFailure.advance(2500);
assert.equal(platformerFailure.state().character.animation, 'crushed');

const finaleFailure = boot();
startToLogic(finaleFailure); passLogic(finaleFailure); passMemory(finaleFailure); passTrivia(finaleFailure); passPlatformer(finaleFailure); finaleFailure.key('1');
assert.equal(finaleFailure.state().character.animation, 'blast');

const roomTesting = boot();
roomTesting.click(410, 680);
assert.equal(roomTesting.state().roomType, 'platformer');
assert.equal(roomTesting.state().testing, true);
roomTesting.advance(1500); roomTesting.key('Enter'); roomTesting.advance(3100);
const beforeInfo = roomTesting.state().puzzle.elapsedMs;
roomTesting.click(500, 130);
assert.equal(roomTesting.state().infoOpen, true);
roomTesting.advance(5000);
assert.equal(roomTesting.state().puzzle.elapsedMs, beforeInfo);
roomTesting.click(300, 670);
assert.equal(roomTesting.state().infoOpen, false);

console.log('Smoke test: idols, collection flow, room selector, paused clues, portrait rooms, platformer, victory, failures, and retry passed.');
