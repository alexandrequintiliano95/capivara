export const SAVE_KEY = 'ilha-das-capivaras:v1';
export const OFFLINE_LIMIT = 8 * 60 * 60;
export const PRODUCTIONS = [
  { name: 'Pomar de tangerinas', role: 'Capivara colhedora', rate: 1, cost: 20, growth: 1.18, island: 1, upgrade: 180, upgradeName: 'Cestos sem fundo', description: 'Tangerinas fresquinhas, o dia inteiro.' },
  { name: 'Horta das capivaras', role: 'Capivara jardineira', rate: 5, cost: 150, growth: 1.2, island: 2, upgrade: 900, upgradeName: 'Regadores encantados', description: 'Quem planta com carinho, colhe mais.' },
  { name: 'Cozinha da vila', role: 'Capivara cozinheira', rate: 25, cost: 900, growth: 1.22, island: 3, upgrade: 4500, upgradeName: 'Receitas da vovó', description: 'Uma pitada de afeto em cada receita.' },
] as const;
export const ISLANDS = [
  { name: 'Ilha do Sossego', cost: 0, unlock: 'Um cantinho para começar.' },
  { name: 'Bosque das Mangas', cost: 250, unlock: 'Libera a horta e +25% de produção.' },
  { name: 'Baía do Sol', cost: 2000, unlock: 'Libera a cozinha e +25% de produção.' },
] as const;

export type Game = {
  version: 1;
  fruits: number;
  earned: number;
  units: number[];
  upgraded: boolean[];
  basket: boolean;
  island: number;
  lastTick: number;
};
export type Action = { type: 'collect' } | { type: 'hire'; index: number } | { type: 'upgrade'; index: number } | { type: 'expand' } | { type: 'basket' };

export function newGame(now: number): Game {
  return { version: 1, fruits: 0, earned: 0, units: [1, 0, 0], upgraded: [false, false, false], basket: false, island: 1, lastTick: now };
}

export function multiplier(game: Game): number { return 1 + (game.island - 1) * 0.25; }
export function productionRate(game: Game, index: number): number {
  return PRODUCTIONS[index].rate * game.units[index] * (game.upgraded[index] ? 2 : 1) * multiplier(game);
}
export function rate(game: Game): number { return PRODUCTIONS.reduce((sum, _, i) => sum + productionRate(game, i), 0); }
export function hireCost(game: Game, index: number): number {
  const item = PRODUCTIONS[index];
  return Math.ceil(item.cost * item.growth ** (game.units[index] - (index === 0 ? 1 : 0)));
}
export function clickValue(game: Game): number { return (game.basket ? 5 : 2) * multiplier(game); }

// Timestamp accounting also covers sleeping devices; timers never award a fixed amount.
export function advance(game: Game, now: number): Game {
  if (!Number.isFinite(now) || now === game.lastTick) return game;
  if (now < game.lastTick) return { ...game, lastTick: now };
  const seconds = Math.min((now - game.lastTick) / 1000, OFFLINE_LIMIT);
  const earned = rate(game) * seconds;
  return { ...game, fruits: game.fruits + earned, earned: game.earned + earned, lastTick: now };
}

export function act(game: Game, action: Action): Game {
  if (action.type === 'collect') {
    const amount = clickValue(game);
    return { ...game, fruits: game.fruits + amount, earned: game.earned + amount };
  }
  if (action.type === 'expand') {
    const next = ISLANDS[game.island];
    return next && game.fruits >= next.cost ? { ...game, fruits: game.fruits - next.cost, island: game.island + 1 } : game;
  }
  if (action.type === 'basket') {
    return !game.basket && game.fruits >= 75 ? { ...game, basket: true, fruits: game.fruits - 75 } : game;
  }
  if (!Number.isInteger(action.index) || action.index < 0 || action.index >= PRODUCTIONS.length) return game;
  const item = PRODUCTIONS[action.index];
  if (game.island < item.island) return game;
  if (action.type === 'hire') {
    if (game.units[action.index] >= 250) return game;
    const cost = hireCost(game, action.index);
    if (game.fruits < cost) return game;
    const units = [...game.units];
    units[action.index]++;
    return { ...game, fruits: game.fruits - cost, units };
  }
  if (game.upgraded[action.index] || game.units[action.index] === 0 || game.fruits < item.upgrade) return game;
  const upgraded = [...game.upgraded];
  upgraded[action.index] = true;
  return { ...game, fruits: game.fruits - item.upgrade, upgraded };
}

// Stored data is untrusted, even when it comes from this browser.
export function decodeSave(raw: string): Game | null {
  try {
    const data = JSON.parse(raw);
    const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
    if (!data || data.version !== 1 || !nonnegative(data.fruits) || !nonnegative(data.earned) || data.earned < data.fruits || !nonnegative(data.lastTick)) return null;
    if (!Number.isInteger(data.island) || data.island < 1 || data.island > 3 || typeof data.basket !== 'boolean') return null;
    if (!Array.isArray(data.units) || data.units.length !== 3 || !data.units.every((n: unknown) => nonnegative(n) && Number.isInteger(n) && n <= 250) || data.units[0] < 1) return null;
    if (!Array.isArray(data.upgraded) || data.upgraded.length !== 3 || !data.upgraded.every((n: unknown) => typeof n === 'boolean')) return null;
    if (PRODUCTIONS.some((p, i) => (p.island > data.island && (data.units[i] > 0 || data.upgraded[i])) || (data.upgraded[i] && data.units[i] === 0))) return null;
    return { version: 1, fruits: data.fruits, earned: data.earned, units: [...data.units], upgraded: [...data.upgraded], basket: data.basket, island: data.island, lastTick: data.lastTick };
  } catch { return null; }
}

/** Restores and checkpoints offline credit. A failed read never permits overwriting unknown progress. */
export function restoreGame(storage: Pick<Storage, 'getItem' | 'setItem'>, now: number) {
  const result = { game: newGame(now), offline: 0, canSave: false, saved: false, recovered: false };
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw !== null) {
      const stored = decodeSave(raw);
      if (stored) {
        result.game = advance(stored, now);
        if (now - stored.lastTick > 30000) result.offline = result.game.fruits - stored.fruits;
      } else {
        storage.setItem(`${SAVE_KEY}:backup`, raw);
        result.recovered = true;
      }
    }
    result.canSave = true;
  } catch { return result; }
  try { storage.setItem(SAVE_KEY, JSON.stringify(result.game)); result.saved = true; } catch { /* The restored game stays playable; subsequent saves can retry. */ }
  return result;
}
