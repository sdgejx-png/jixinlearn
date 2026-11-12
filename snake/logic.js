(function (root) {
  "use strict";

  var OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
  var DELTA = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  function sameCell(a, b) {
    return !!a && !!b && a.x === b.x && a.y === b.y;
  }

  function occupies(snake, cell, ignoreTail) {
    var limit = ignoreTail ? snake.length - 1 : snake.length;
    for (var i = 0; i < limit; i += 1) {
      if (sameCell(snake[i], cell)) return true;
    }
    return false;
  }

  function spawnFood(game, preferNear) {
    var open = [];
    var y;
    var x;
    for (y = 0; y < game.rows; y += 1) {
      for (x = 0; x < game.cols; x += 1) {
        if (!occupies(game.snake, { x: x, y: y }, false)) open.push({ x: x, y: y });
      }
    }
    if (open.length === 0) return null;
    var pool = open;
    if (preferNear && game.snake.length) {
      var head = game.snake[0];
      var nearby = open.filter(function (cell) {
        var dist = Math.abs(cell.x - head.x) + Math.abs(cell.y - head.y);
        return dist >= 2 && dist <= 6;
      });
      if (nearby.length) pool = nearby;
    }
    var index = Math.floor(game.rng() * pool.length);
    if (index >= pool.length) index = pool.length - 1;
    if (index < 0) index = 0;
    return pool[index];
  }

  function defaultSnake(cols, rows) {
    var headX = Math.min(4, cols - 1);
    var y = Math.floor((rows - 1) / 2);
    var snake = [];
    var i;
    for (i = 0; i < 3; i += 1) {
      var x = headX - i;
      if (x < 0) break;
      snake.push({ x: x, y: y });
    }
    return snake;
  }

  function copySnake(snake) {
    return snake.map(function (cell) {
      return { x: cell.x, y: cell.y };
    });
  }

  function createGame(options) {
    options = options || {};
    var cols = options.cols === undefined ? 20 : options.cols;
    var rows = options.rows === undefined ? 20 : options.rows;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2) {
      throw new Error("棋盘至少要 2×2");
    }
    var game = {
      cols: cols,
      rows: rows,
      rng: typeof options.rng === "function" ? options.rng : Math.random,
      initial: options,
      snake: [],
      direction: "right",
      queue: [],
      food: null,
      score: 0,
      status: "idle",
    };
    reset(game);
    return game;
  }

  function reset(game) {
    var options = game.initial || {};
    game.snake = options.snake ? copySnake(options.snake) : defaultSnake(game.cols, game.rows);
    game.direction = DELTA[options.direction] ? options.direction : "right";
    game.queue = [];
    game.score = 0;
    game.status = "idle";
    if (Object.prototype.hasOwnProperty.call(options, "food")) {
      game.food = options.food ? { x: options.food.x, y: options.food.y } : null;
    } else {
      game.food = spawnFood(game, true);
    }
  }

  function queueDirection(game, dir) {
    if (!DELTA[dir]) return false;
    if (game.status === "over" || game.status === "won") return false;
    if (game.status === "idle") {
      var neck = game.snake[1];
      var head = game.snake[0];
      var delta = DELTA[dir];
      if (neck && head.x + delta.x === neck.x && head.y + delta.y === neck.y) return false;
      game.direction = dir;
      game.queue = [];
      return true;
    }
    var pending = game.queue.length ? game.queue[game.queue.length - 1] : game.direction;
    if (dir === pending || dir === OPPOSITE[pending]) return false;
    if (game.queue.length >= 2) return false;
    game.queue.push(dir);
    return true;
  }

  function start(game) {
    if (game.status !== "idle" && game.status !== "paused") return false;
    game.status = "running";
    return true;
  }

  function pause(game) {
    if (game.status !== "running") return false;
    game.status = "paused";
    return true;
  }

  function togglePause(game) {
    if (game.status === "running") return pause(game);
    if (game.status === "paused") return start(game);
    return false;
  }

  function tick(game) {
    if (game.status !== "running") return { moved: false };
    if (game.queue.length) game.direction = game.queue.shift();

    var delta = DELTA[game.direction];
    var head = game.snake[0];
    var next = { x: head.x + delta.x, y: head.y + delta.y };
    var willEat = sameCell(next, game.food);

    if (next.x < 0 || next.y < 0 || next.x >= game.cols || next.y >= game.rows) {
      game.status = "over";
      return { moved: false, died: true, reason: "wall" };
    }
    if (occupies(game.snake, next, !willEat)) {
      game.status = "over";
      return { moved: false, died: true, reason: "self" };
    }

    game.snake.unshift(next);
    if (willEat) {
      game.score += 1;
      if (game.snake.length >= game.cols * game.rows) {
        game.food = null;
        game.status = "won";
        return { moved: true, ate: true, won: true };
      }
      game.food = spawnFood(game);
      return { moved: true, ate: true };
    }

    game.snake.pop();
    return { moved: true };
  }

  function stepMs(score) {
    return Math.max(90, 260 - score * 6);
  }

  root.SnakeLogic = {
    createGame: createGame,
    reset: reset,
    queueDirection: queueDirection,
    start: start,
    pause: pause,
    togglePause: togglePause,
    tick: tick,
    stepMs: stepMs,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
