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
    fillRect() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, fillText() {}
  }, { set(target, property, value) { target[property] = value; return true; } });
  const canvas = {
    width: 960, height: 600,
    getContext() { return context2d; },
    addEventListener(type, fn) { canvasHandlers[type] = fn; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 600 }; },
    requestFullscreen() {}
  };
  const storage = new Map();
  const document = { querySelector() { return canvas; }, fullscreenElement: null, exitFullscreen() {} };
  const sandbox = {
    console, document, navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    localStorage: { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } },
    matchMedia() { return { matches: false }; }, setInterval() {}, Intl, Math, Date, JSON
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (type, fn) => { handlers[type] = fn; };
  vm.runInNewContext(script, sandbox, { filename: 'index.html' });

  const key = (value) => handlers.keydown({ key: value, preventDefault() {} });
  const advance = (ms) => sandbox.advanceTime(ms);
  const state = () => JSON.parse(sandbox.render_game_to_text());
  return { key, advance, state, storage, click: (x, y) => canvasHandlers.click({ clientX: x, clientY: y }) };
}

function startToLogic(game) {
  game.key('Enter');
  game.advance(1400);
  assert.equal(game.state().roomType, 'logic');
}

function passLogic(game) {
  ['1', '2', '3', '4', 'Enter'].forEach(game.key);
  game.advance(1200); game.advance(1400);
  assert.equal(game.state().roomType, 'memory');
}

function passMemory(game) {
  game.advance(3100);
  ['1', '3', '2', '4'].forEach(game.key);
  game.advance(950); game.advance(4400);
  ['1', '3', '2', '4', '3', '1'].forEach(game.key);
  game.advance(1200); game.advance(1400);
  assert.equal(game.state().roomType, 'trivia');
}

function passTrivia(game) {
  game.key('2');
  game.advance(1200); game.advance(1400);
  assert.equal(game.state().roomType, 'reaction');
}

function passReaction(game) {
  game.advance(1150); game.key(' ');
  game.advance(550); game.advance(1500); game.key(' ');
  game.advance(550); game.advance(950); game.key(' ');
  game.advance(1200); game.advance(1400);
  assert.equal(game.state().roomType, 'finale');
}

function passFinale(game) {
  game.key('2');
  ['1', '2', '3', 'Enter'].forEach(game.key);
  ['1', '3', '2'].forEach(game.key);
  game.advance(1350); game.key(' ');
  game.advance(1200);
}

function passDayOne(game) {
  startToLogic(game); passLogic(game); passMemory(game); passTrivia(game); passReaction(game); passFinale(game);
}

const success = boot();
passDayOne(success);
assert.equal(success.state().mode, 'victory');
assert.equal(success.state().score, 5);
assert.deepEqual(success.state().results, [true, true, true, true, true]);

const failure = boot();
startToLogic(failure);
['2', '1', '3', '4', 'Enter'].forEach(failure.key);
assert.equal(failure.state().mode, 'fail');
assert.equal(failure.state().character.animation, 'burn');
failure.advance(1600);
assert.equal(failure.state().mode, 'gameover');
failure.key('Enter');
assert.equal(failure.state().attempt, 2);
assert.equal(failure.state().official, false);

const memoryFailure = boot();
startToLogic(memoryFailure); passLogic(memoryFailure); memoryFailure.advance(3100); memoryFailure.key('2');
assert.equal(memoryFailure.state().character.animation, 'shadow');

const triviaFailure = boot();
startToLogic(triviaFailure); passLogic(triviaFailure); passMemory(triviaFailure); triviaFailure.key('1');
assert.equal(triviaFailure.state().character.animation, 'fall');

const reactionFailure = boot();
startToLogic(reactionFailure); passLogic(reactionFailure); passMemory(reactionFailure); passTrivia(reactionFailure); reactionFailure.key(' ');
assert.equal(reactionFailure.state().character.animation, 'crushed');

const finaleFailure = boot();
startToLogic(finaleFailure); passLogic(finaleFailure); passMemory(finaleFailure); passTrivia(finaleFailure); passReaction(finaleFailure); finaleFailure.key('1');
assert.equal(finaleFailure.state().character.animation, 'blast');

console.log('Smoke test: full victory, all room failure animations, and retry state passed.');
