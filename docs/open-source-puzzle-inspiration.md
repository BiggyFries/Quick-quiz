# Prototype Corridor open-source inspiration

Daily Venture uses original TypeScript implementations, original levels, generic mechanic names, and code-native art. The projects below are reference material for rules, validation strategies, and motion techniques; no third-party art or copied level data is included.

## Puzzle mechanics

- [Simon Tatham's Portable Puzzle Collection](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) — MIT-licensed collection of compact deterministic puzzle engines. Labs 17–21 take broad mechanical inspiration from ray deduction, bridge networks, flood filling, rotationally symmetric regions, and peg jumping.
- [PuzzleScript](https://github.com/increpare/PuzzleScript) — MIT-licensed grid-puzzle engine. Its rule-driven separation between game state and rendering informed the new motion-lab reducer and deterministic snapshots.

## Animation and physics

- [Phaser examples](https://github.com/phaserjs/examples) — MIT-licensed source examples. Only code patterns are reference material; the repository explicitly separates source-code licensing from asset licensing, so Daily Venture does not import its assets.
- [Phaser Matter physics](https://docs.phaser.io/phaser/concepts/physics/matter) — reference for rigid bodies, velocity, gravity, constraints, collisions, and deterministic stepping concepts used by the kinetic rooms planned for Labs 33–36.

## Adaptation rules

1. Keep names, narrative, UI, art, sounds, levels, and source code original to Daily Venture.
2. Use generic puzzle mechanics rather than third-party branding.
3. Preserve deterministic `window.advanceTime(ms)` and `window.render_game_to_text()` support.
4. Keep the customized explorer visible only where the room perspective supports it, and depth-sort the explorer with world props when the character occupies the board.
