// PERIHELION boons: the choice offered between waves.
//
// Clearing a wave (short of the last) opens a draft of three boons. Each is
// a small, stackable change to the run: faster bolts, a wider nova, a
// stronger plasma magnet, a reinforced hull, swifter thrusters, or plasma
// that mends the Heart more often. The draft is the game's one decision
// point, so the pool stays small and every card's effect is readable at a
// glance. Layout lives here too, so the renderer and the click handler
// agree on where the cards are.

import { VIEW } from './config.js';
import { shuffle } from './random.js';

export const BOONS = {
  rapid: {
    name: 'Rapid Bolts',
    desc: 'Fire 25% faster.',
    apply(game) { game.mods.fireRate *= 1.25; },
  },
  widenova: {
    name: 'Wider Nova',
    desc: 'Nova radius +25%.',
    apply(game) { game.mods.novaRadius *= 1.25; },
  },
  magnet: {
    name: 'Plasma Magnet',
    desc: 'Plasma drawn in from 60% farther.',
    apply(game) { game.mods.magnet *= 1.6; },
  },
  hull: {
    name: 'Reinforced Hull',
    desc: '+1 max hull, and repair 1 now.',
    apply(game) {
      game.ship.maxHull += 1;
      game.ship.hull = Math.min(game.ship.maxHull, game.ship.hull + 1);
    },
  },
  swift: {
    name: 'Swift Thrusters',
    desc: 'Thrust +20%.',
    apply(game) { game.mods.thrust *= 1.2; },
  },
  heartward: {
    name: 'Heartward Plasma',
    desc: 'One fewer cell needed to mend the Heart.',
    apply(game) { game.mendEvery = Math.max(3, game.mendEvery - 1); },
  },
};

// Three distinct boons the run can still use: the hull card leaves the pool
// once the hull is as strong as it gets, and Heartward leaves it once
// mending is as cheap as it gets.
export function pickBoons(rng, game) {
  const pool = Object.keys(BOONS).filter((id) => {
    if (id === 'hull') return game.ship.maxHull < 6;
    if (id === 'heartward') return game.mendEvery > 3;
    return true;
  });
  return shuffle(rng, pool).slice(0, 3);
}

// Card geometry, shared by the renderer and the click hit-test.
export function cardRect(index) {
  const w = 264;
  const h = 132;
  const gap = 28;
  const total = w * 3 + gap * 2;
  return {
    x: VIEW.width / 2 - total / 2 + index * (w + gap),
    y: 356,
    w,
    h,
  };
}
