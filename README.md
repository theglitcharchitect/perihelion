# perihelion

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/theglitcharchitect/perihelion/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/theglitcharchitect/perihelion/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

PERIHELION is a gravity-well defense game for the desktop browser. A living star, the Heart, pulls everything toward it, and hollow shards ride that gravity down to crack it open. You pilot a guardian skiff in free flight around the star: shatter eight escalating waves of falling shards, chain kills into combo multipliers, and gather the plasma they drop, because plasma feeds your nova shockwave and slowly mends the Heart. Between waves the Heart offers a gift, one of three boons (faster bolts, a wider nova, a reinforced hull, and more), so every run bends a little differently. Survive all eight waves to reach the dawn.

## Run it

```sh
node serve.ts
```

then open http://127.0.0.1:8080/ in a desktop browser. The game is plain static files under `game/` with no build step and no network request; any static file server works just as well. (`node main.ts` is the hand-in program: it copies `game/` and `screenshots/` to the output directory and writes the dossier the judges read.)

## How to play

- **WASD or arrow keys** thrust, **mouse** aims, **hold left click or F** fires pulse bolts.
- **Space, E or right-click** releases a nova shockwave when you hold a charge. Plasma cells refill charges, eight to a charge, and every fifth cell mends the Heart.
- **P** pauses. Clearing a wave opens a gift draft: press **1, 2 or 3** or click a card to take its boon into the next wave. You lose when the Heart's integrity or your hull reaches zero; you win by clearing wave 8.
- Six shard kinds fall: Shards, Splinters, Splitters that burst into Splinters, weaving Weavers, fast Darts, and armoured Brutes that take five hits and hurt the Heart badly when they land.

---
<sub>Entered on [make.fun](https://make.fun/?ref=f5nczt9z&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
