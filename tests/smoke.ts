import assert from 'node:assert/strict';
import { WEEK_ONE } from '../src/content/week1';
import { currentPuzzleConfig } from '../src/game/session';
import { beginCurrentLevel, failCurrentPuzzle, finishResolution, openAdventure, winCurrentPuzzle } from './helpers';

let victories = 0;
let failureRoutes = 0;

for (const adventure of WEEK_ONE) {
  let state = openAdventure(adventure);
  for (let levelIndex = 0; levelIndex < 5; levelIndex += 1) {
    state = beginCurrentLevel(state);
    state = winCurrentPuzzle(state);
    state = finishResolution(state);
  }
  assert.equal(state.mode, 'results');
  assert.equal(state.finalOutcome, 'survived');
  assert.equal(state.results.length, 5);
  assert.ok(state.results.every((result) => result.success));
  victories += 1;

  for (let targetLevel = 0; targetLevel < 5; targetLevel += 1) {
    state = openAdventure(adventure);
    for (let levelIndex = 0; levelIndex < targetLevel; levelIndex += 1) {
      state = beginCurrentLevel(state);
      state = finishResolution(winCurrentPuzzle(state));
    }
    state = beginCurrentLevel(state);
    const config = currentPuzzleConfig(state);
    assert.ok(config);
    state = failCurrentPuzzle(state, config);
    state = finishResolution(state);
    assert.equal(state.mode, 'results');
    assert.equal(state.finalOutcome, 'failed');
    assert.equal(state.results.length, targetLevel + 1);
    failureRoutes += 1;
  }
}

assert.equal(victories, 7);
assert.equal(failureRoutes, 35);
console.log(`smoke: ${victories} complete victories and ${failureRoutes} room-specific failure routes passed`);
