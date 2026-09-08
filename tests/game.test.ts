import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, advance, clickValue, decodeSave, hireCost, multiplier, newGame, OFFLINE_LIMIT, rate, restoreGame, SAVE_KEY } from '../lib/game.ts';

await test('the first capybara works automatically; collection and hires spend the displayed price', () => {
  const initial = newGame(1000);
  assert.equal(rate(initial), 1);
  assert.equal(hireCost(initial, 0), 20);
  assert.equal(act(initial, { type: 'collect' }).fruits, 2);
  assert.equal(act(initial, { type: 'hire', index: 0 }), initial);
  const funded = advance(initial, 21000);
  assert.equal(funded.fruits, 20);
  const bought = act(funded, { type: 'hire', index: 0 });
  assert.equal(bought.fruits, 0);
  assert.deepEqual(bought.units, [2, 0, 0]);
  assert.equal(act(bought, { type: 'hire', index: 0 }), bought);
  assert.equal(hireCost(bought, 0), 24);
  assert.equal(initial.fruits, 0);
});

await test('island gating, one-time upgrades and additive island bonuses remain consistent', () => {
  const funded = { ...newGame(1000), fruits: 30000, earned: 30000 };
  assert.equal(act(funded, { type: 'hire', index: 1 }), funded);
  assert.equal(act(funded, { type: 'upgrade', index: 1 }), funded);
  const island2 = act(funded, { type: 'expand' });
  assert.equal(island2.fruits, 29750);
  assert.equal(multiplier(island2), 1.25);
  const garden = act(island2, { type: 'hire', index: 1 });
  assert.equal(rate(garden), 7.5);
  const upgraded = act(garden, { type: 'upgrade', index: 1 });
  assert.equal(rate(upgraded), 13.75);
  assert.equal(act(upgraded, { type: 'upgrade', index: 1 }), upgraded);
  const island3 = act(upgraded, { type: 'expand' });
  assert.equal(multiplier(island3), 1.5);
  assert.equal(act(island3, { type: 'expand' }), island3);
  const basket = act(island3, { type: 'basket' });
  assert.equal(clickValue(basket), 7.5);
  assert.equal(act(basket, { type: 'basket' }), basket);
});

await test('offline earnings cap at eight hours and a saved return never pays twice', () => {
  const initial = newGame(1000);
  const later = 1000 + 24 * 60 * 60 * 1000;
  const returned = advance(initial, later);
  assert.equal(returned.fruits, OFFLINE_LIMIT);
  assert.equal(returned.lastTick, later);
  const loaded = decodeSave(JSON.stringify(returned));
  assert.ok(loaded);
  assert.equal(advance(loaded, later).fruits, OFFLINE_LIMIT);
  assert.equal(advance(loaded, later + 1000).fruits, OFFLINE_LIMIT + 1);
  assert.equal(advance(returned, later - 1000).fruits, returned.fruits);
  assert.equal(advance(returned, NaN), returned);
});

await test('moving the system clock backward does not freeze production', () => {
  const rebased = advance(newGame(10000), 5000);
  assert.equal(rebased.fruits, 0);
  assert.equal(rebased.lastTick, 5000);
  assert.equal(advance(rebased, 6000).fruits, 1);
});

await test('restoring checkpoints offline credit and preserves unknown saves when storage reads fail', () => {
  const entries = new Map([[SAVE_KEY, JSON.stringify(newGame(1000))]]);
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  const restored = restoreGame(storage, 61000);
  assert.equal(restored.offline, 60);
  assert.equal(restored.saved, true);
  assert.equal(restoreGame(storage, 61000).offline, 0);
  const previous = entries.get(SAVE_KEY);
  const failed = restoreGame({ ...storage, getItem: () => { throw new Error('storage denied'); } }, 121000);
  assert.equal(failed.canSave, false);
  assert.equal(entries.get(SAVE_KEY), previous);
  entries.set(SAVE_KEY, 'damaged');
  const recovered = restoreGame(storage, 121000);
  assert.equal(recovered.recovered, true);
  assert.equal(entries.get(`${SAVE_KEY}:backup`), 'damaged');
  assert.deepEqual(recovered.game, newGame(121000));
});

await test('fractional timer intervals and upgrades do not change already-earned production', () => {
  const initial = newGame(1000);
  let partitioned = initial;
  for (let n = 1; n <= 40; n++) partitioned = advance(partitioned, 1000 + n * 250);
  assert.equal(partitioned.fruits, advance(initial, 11000).fruits);
  const funded = { ...partitioned, fruits: 180, earned: 180 };
  const doubled = act(funded, { type: 'upgrade', index: 0 });
  assert.equal(doubled.fruits, 0);
  assert.equal(advance(doubled, 12000).fruits, 2);
});

await test('malformed saves and invalid purchases cannot corrupt the game', () => {
  const valid = newGame(1000);
  assert.deepEqual(decodeSave(JSON.stringify(valid)), valid);
  for (const raw of ['not json', 'null', '[]', '{"version":999}', JSON.stringify({ ...valid, fruits: -1 }), JSON.stringify({ ...valid, earned: Infinity }), JSON.stringify({ ...valid, units: [1.5, 0, 0] }), JSON.stringify({ ...valid, units: [1, 1, 0] }), JSON.stringify({ ...valid, island: 4 }), JSON.stringify({ ...valid, lastTick: 'bad' }), JSON.stringify({ ...valid, upgraded: [false, true, false] })]) assert.equal(decodeSave(raw), null);
  for (const index of [-1, 3, 1.5, NaN]) assert.equal(act(valid, { type: 'hire', index }), valid);
  const full = { ...valid, fruits: 1e30, earned: 1e30, units: [250, 0, 0] };
  assert.equal(act(full, { type: 'hire', index: 0 }), full);
});
