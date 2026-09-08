import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOALS, ISLANDS, PRODUCTIONS, projectCost, act, advance, clickValue, decodeSave, hireCost, multiplier, newGame, OFFLINE_LIMIT, rate, restoreGame, SAVE_KEY } from '../lib/game.ts';

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
  assert.deepEqual(bought.units, [2, 0, 0, 0, 0, 0]);
  assert.equal(act(bought, { type: 'hire', index: 0 }), bought);
  assert.equal(hireCost(bought, 0), 24);
  assert.equal(initial.fruits, 0);
});

await test('island gating, one-time upgrades and additive island bonuses remain consistent', () => {
  const funded = { ...newGame(1000), fruits: 30000, earned: 30000 };
  assert.equal(act(funded, { type: 'hire', index: 1 }), funded);
  assert.equal(act(funded, { type: 'upgrade', index: 1 }), funded);
  const island2 = act(funded, { type: 'expand' });
  assert.equal(island2.fruits, 28500);
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
  for (const raw of ['not json', 'null', '[]', '{"version":999}', JSON.stringify({ ...valid, fruits: -1 }), JSON.stringify({ ...valid, earned: Infinity }), JSON.stringify({ ...valid, units: [1.5, 0, 0] }), JSON.stringify({ ...valid, units: [1, 1, 0] }), JSON.stringify({ ...valid, island: 7 }), JSON.stringify({ ...valid, lastTick: 'bad' }), JSON.stringify({ ...valid, upgraded: [false, true, false] })]) assert.equal(decodeSave(raw), null);
  for (const index of [-1, 6, 1.5, NaN]) assert.equal(act(valid, { type: 'hire', index }), valid);
  const full = { ...valid, fruits: 1e30, earned: 1e30, units: [250, 0, 0] };
  assert.equal(act(full, { type: 'hire', index: 0 }), full);
});

await test('legacy saves keep balances, helpers and purchased upgrades', () => {
  const legacy = { version: 1, fruits: 42, earned: 5000, units: [8, 2, 1], upgraded: [true, false, true], basket: true, island: 3, lastTick: 1000 };
  const migrated = decodeSave(JSON.stringify(legacy));
  assert.ok(migrated);
  assert.equal(migrated.fruits, 42);
  assert.deepEqual(migrated.units, [8, 2, 1, 0, 0, 0]);
  assert.deepEqual(migrated.upgraded, [true, false, true, false, false, false]);
  assert.equal(migrated.project, 0);
  assert.deepEqual(decodeSave(JSON.stringify(migrated)), migrated);
});
await test('late islands require both savings and a developed community', () => {
  let game = { ...newGame(0), island: 3, fruits: 1e9, earned: 1e9 };
  assert.equal(act(game, { type: 'expand' }), game);
  game = { ...game, units: [30, 20, 20, 0, 0, 0] };
  for (let island = 4; island <= ISLANDS.length; island++) {
    const before = game;
    game = act(game, { type: 'expand' });
    assert.equal(game.island, island);
    assert.equal(before.fruits - game.fruits, ISLANDS[island - 1].cost);
    game = act(game, { type: 'hire', index: island - 1 });
    assert.equal(game.units[island - 1], 1);
  }
  assert.equal(act(game, { type: 'expand' }), game);
  assert.equal(PRODUCTIONS.length, 6);
});
await test('objectives pay once and construction has escalating cost and a hard cap', () => {
  const initial = newGame(0);
  assert.equal(act(initial, { type: 'claim', index: 0 }), initial);
  const achieved = { ...initial, units: [10, 0, 0, 0, 0, 0] };
  const paid = act(achieved, { type: 'claim', index: 0 });
  assert.equal(paid.fruits, GOALS[0].reward);
  assert.equal(act(paid, { type: 'claim', index: 0 }), paid);
  for (const index of [-1, 99, NaN, 0.5]) assert.equal(act(paid, { type: 'claim', index }), paid);
  let game = { ...initial, fruits: 1e14, earned: 1e14 };
  for (let level = 1; level <= 20; level++) {
    const cost = projectCost(game); const balance = game.fruits;
    game = act(game, { type: 'project' });
    assert.equal(game.project, level);
    assert.equal(game.fruits, balance - cost);
    assert.ok(projectCost(game) > cost);
  }
  assert.equal(act(game, { type: 'project' }), game);
  assert.equal(multiplier(game), 3);
  for (const patch of [{project: 21}, {claimed: [0, 0]}, {claimed: [-1]}]) assert.equal(decodeSave(JSON.stringify({...game, ...patch})), null);
});
