import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8"), sandbox);
const { createGame, queueDirection, tick, start, pause, togglePause, reset, stepMs } = sandbox.SnakeLogic;

function head(game) {
  return game.snake[0];
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("开局食物离蛇头只有几格", () => {
  const game = createGame({ rng: () => 0.4 });
  const startHead = plain(head(game));
  const food = plain(game.food);
  const dist = Math.abs(food.x - startHead.x) + Math.abs(food.y - startHead.y);
  assert.ok(dist >= 2 && dist <= 6, "distance " + dist);
});

test("开局蛇长为 3，食物不在蛇身上", () => {
  const game = createGame({ rng: () => 0 });
  assert.equal(game.snake.length, 3);
  assert.equal(game.status, "idle");
  assert.equal(game.score, 0);
  assert.ok(game.food);
  for (const cell of game.snake) {
    assert.equal(cell.x === game.food.x && cell.y === game.food.y, false);
  }
});

test("吃到食物会变长并加分", () => {
  const game = createGame();
  const startHead = head(game);
  game.food = { x: startHead.x + 1, y: startHead.y };
  start(game);
  const result = tick(game);
  assert.equal(result.ate, true);
  assert.equal(game.score, 1);
  assert.equal(game.snake.length, 4);
  assert.deepEqual(plain(head(game)), { x: startHead.x + 1, y: startHead.y });
  for (const cell of game.snake) {
    assert.equal(cell.x === game.food.x && cell.y === game.food.y, false);
  }
});

test("撞墙结束，蛇身保持原位", () => {
  const game = createGame({
    direction: "left",
    snake: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    food: { x: 5, y: 5 },
  });
  start(game);
  const before = plain(game.snake);
  const result = tick(game);
  assert.equal(result.died, true);
  assert.equal(result.reason, "wall");
  assert.equal(game.status, "over");
  assert.deepEqual(plain(game.snake), before);
});

test("咬到自己结束", () => {
  const game = createGame({
    direction: "right",
    snake: [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ],
    food: { x: 0, y: 0 },
  });
  start(game);
  const result = tick(game);
  assert.equal(result.died, true);
  assert.equal(result.reason, "self");
});

test("走进即将离开的尾巴不算撞到自己", () => {
  const game = createGame({
    cols: 3,
    rows: 2,
    direction: "down",
    snake: [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    food: { x: 2, y: 0 },
  });
  start(game);
  const result = tick(game);
  assert.equal(result.moved, true);
  assert.equal(result.died, undefined);
  assert.deepEqual(plain(head(game)), { x: 1, y: 1 });
  assert.equal(game.snake.length, 4);
});

test("未开始时可以选定安全方向，不能往脖子上走", () => {
  const game = createGame();
  assert.equal(queueDirection(game, "left"), false);
  assert.equal(game.direction, "right");
  assert.equal(queueDirection(game, "up"), true);
  assert.equal(game.direction, "up");
  start(game);
  assert.equal(queueDirection(game, "down"), false);
  assert.equal(queueDirection(game, "left"), true);
  assert.equal(queueDirection(game, "right"), false);
  assert.equal(queueDirection(game, "down"), true);
  assert.equal(queueDirection(game, "left"), false);
});

test("转向队列会在随后两步依次生效", () => {
  const game = createGame();
  const y = head(game).y;
  start(game);
  queueDirection(game, "up");
  queueDirection(game, "left");
  tick(game);
  assert.equal(game.direction, "up");
  assert.equal(head(game).y, y - 1);
  tick(game);
  assert.equal(game.direction, "left");
  assert.equal(head(game).x, 3);
});

test("暂停时不移动，继续后恢复", () => {
  const game = createGame();
  start(game);
  assert.equal(pause(game), true);
  const before = plain(game.snake);
  assert.deepEqual(plain(tick(game)), { moved: false });
  assert.deepEqual(plain(game.snake), before);
  assert.equal(togglePause(game), true);
  assert.equal(game.status, "running");
  assert.equal(tick(game).moved, true);
});

test("吃满棋盘获胜", () => {
  const game = createGame({
    cols: 2,
    rows: 2,
    direction: "down",
    snake: [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ],
    food: { x: 1, y: 1 },
  });
  start(game);
  const result = tick(game);
  assert.equal(result.won, true);
  assert.equal(game.status, "won");
  assert.equal(game.score, 1);
  assert.equal(game.snake.length, 4);
  assert.equal(game.food, null);
  assert.equal(start(game), false);
});

test("结束后忽略转向，重置回到开局", () => {
  const game = createGame({
    direction: "left",
    snake: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    food: { x: 5, y: 5 },
  });
  start(game);
  tick(game);
  assert.equal(game.status, "over");
  assert.equal(queueDirection(game, "up"), false);
  reset(game);
  assert.equal(game.status, "idle");
  assert.equal(game.score, 0);
  assert.equal(game.snake.length, 3);
});

test("速度随分数加快并有下限", () => {
  assert.equal(stepMs(0), 260);
  assert.equal(stepMs(10), 200);
  assert.equal(stepMs(100), 90);
});

test("随机游玩不会把食物生成在蛇身上", () => {
  let seed = 7;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const game = createGame({ rng: next });
  start(game);
  const dirs = ["up", "down", "left", "right"];
  let steps = 0;
  while (game.status === "running" && steps < 4000) {
    queueDirection(game, dirs[Math.floor(next() * dirs.length)]);
    tick(game);
    if (game.food) {
      for (const cell of game.snake) {
        assert.equal(cell.x === game.food.x && cell.y === game.food.y, false);
      }
    }
    assert.equal(game.score, game.snake.length - 3);
    steps += 1;
  }
  assert.ok(steps > 0);
  assert.ok(game.status === "running" || game.status === "over" || game.status === "won");
});

test("过小的棋盘会被拒绝", () => {
  assert.throws(() => createGame({ cols: 1, rows: 4 }), /2×2/);
});
