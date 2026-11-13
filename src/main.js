import { Engine } from './core/Engine.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Engine();
  window.game = game;
  game.start();
});
