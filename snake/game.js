(function () {
  "use strict";

  var BEST_KEY = "snake-best-score";
  var canvas = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayText = document.getElementById("overlay-text");
  var actionButton = document.getElementById("action");
  var scoreNode = document.getElementById("score");
  var bestNode = document.getElementById("best");
  var soundButton = document.getElementById("sound");
  var ctx = canvas.getContext("2d");

  var game = SnakeLogic.createGame();
  var best = readBest();
  var soundOn = true;
  var audioCtx = null;
  var lastFrame = 0;
  var accumulator = 0;
  var pointer = null;
  var endReason = null;
  var introDismissed = false;
  var hint = document.getElementById("hint");

  var KEY_DIRS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right",
  };

  function readBest() {
    try {
      var value = Number(localStorage.getItem(BEST_KEY));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch (error) {
      return 0;
    }
  }

  function writeBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (error) {
      /* 隐私模式里记不住最高分，对局本身不受影响。 */
    }
  }

  function renderScores() {
    scoreNode.textContent = String(game.score);
    bestNode.textContent = String(best);
  }

  function syncOverlay() {
    var title = "准备开始";
    var text = "方向键、WASD，或下方按钮。吃到红果会变长，走得也会越来越快。";
    var label = "开始";

    if (game.status === "paused") {
      title = "暂停";
      text = "空格或「继续」接着走。";
      label = "继续";
    } else if (game.status === "over") {
      title = endReason === "self" ? "咬到自己了" : "撞到墙了";
      text = "这局吃到 " + game.score + " 颗红果。";
      label = "再来一局";
    } else if (game.status === "won") {
      title = "吃完了";
      text = "整张棋盘都是你的，共 " + game.score + " 颗。";
      label = "再来一局";
    }

    overlayTitle.textContent = title;
    overlayText.textContent = text;
    actionButton.textContent = label;
    var showBoard = game.status === "running" || (game.status === "idle" && introDismissed);
    overlay.hidden = showBoard;
    canvas.setAttribute("aria-hidden", showBoard ? "false" : "true");
    if (game.status === "running") hint.textContent = "空格暂停 · 不能直接掉头";
    else if (game.status === "paused") hint.textContent = "空格继续";
    else hint.textContent = "方向键、WASD 或下方按钮";
  }

  function rememberBest() {
    if (game.score > best) {
      best = game.score;
      writeBest(best);
    }
  }

  function begin() {
    if (game.status === "over" || game.status === "won") {
      SnakeLogic.reset(game);
      endReason = null;
      introDismissed = true;
      accumulator = 0;
      lastFrame = 0;
      syncOverlay();
      return;
    }
    if (SnakeLogic.start(game)) {
      accumulator = 0;
      lastFrame = 0;
      introDismissed = true;
      syncOverlay();
    }
  }

  function dismissIntro() {
    if (game.status !== "idle") return false;
    introDismissed = true;
    syncOverlay();
    return true;
  }

  function steer(dir) {
    if (game.status === "over" || game.status === "won") return;
    var wasPaused = game.status === "paused";
    var accepted = SnakeLogic.queueDirection(game, dir);
    if (wasPaused) begin();
    else if (game.status === "idle" && accepted) begin();
  }

  function toggleSound() {
    soundOn = !soundOn;
    soundButton.textContent = soundOn ? "音效开" : "音效关";
    soundButton.setAttribute("aria-pressed", soundOn ? "true" : "false");
  }

  function beep(freq, duration, type) {
    if (!soundOn) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function mix(from, to, t) {
    return {
      r: Math.round(from.r + (to.r - from.r) * t),
      g: Math.round(from.g + (to.g - from.g) * t),
      b: Math.round(from.b + (to.b - from.b) * t),
    };
  }

  function rgb(color) {
    return "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
  }

  function draw() {
    var width = canvas.clientWidth;
    if (!width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.max(1, Math.round(width * dpr));
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }

    var margin = Math.round(size * 0.04);
    var cell = (size - margin * 2) / game.cols;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#1b3026";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "rgba(244, 236, 214, 0.08)";
    var y;
    var x;
    for (y = 0; y < game.rows; y += 1) {
      for (x = 0; x < game.cols; x += 1) {
        ctx.beginPath();
        ctx.arc(
          margin + (x + 0.5) * cell,
          margin + (y + 0.5) * cell,
          Math.max(1, cell * 0.04),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    if (game.food) drawFood(margin, cell);
    drawSnake(margin, cell);
    renderScores();
  }

  function cellBox(margin, cell, x, y, scale) {
    var inset = cell * (1 - scale) / 2;
    return {
      x: margin + x * cell + inset,
      y: margin + y * cell + inset,
      size: cell * scale,
    };
  }

  function drawFood(margin, cell) {
    var box = cellBox(margin, cell, game.food.x, game.food.y, 0.62);
    var cx = box.x + box.size / 2;
    var cy = box.y + box.size / 2;
    var radius = box.size / 2;
    ctx.fillStyle = "#ff5d52";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd0c4";
    ctx.beginPath();
    ctx.arc(cx - radius * 0.28, cy - radius * 0.28, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8fbf73";
    ctx.beginPath();
    ctx.ellipse(cx + radius * 0.35, cy - radius * 0.85, radius * 0.42, radius * 0.22, -0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSnake(margin, cell) {
    var tail = { r: 150, g: 92, b: 36 };
    var head = { r: 255, g: 224, b: 150 };
    var dead = game.status === "over";
    var i;
    for (i = game.snake.length - 1; i >= 0; i -= 1) {
      var part = game.snake[i];
      var t = game.snake.length === 1 ? 1 : 1 - i / (game.snake.length - 1);
      var color = mix(tail, head, t);
      if (dead) color = mix(color, { r: 90, g: 70, b: 60 }, 0.55);
      var box = cellBox(margin, cell, part.x, part.y, i === 0 ? 0.84 : 0.72);
      ctx.fillStyle = rgb(color);
      fillRoundRect(ctx, box.x, box.y, box.size, box.size, box.size * 0.32);
      if (i === 0) drawEyes(box);
    }
  }

  function fillRoundRect(context, x, y, w, h, r) {
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(x, y, w, h, r);
    } else {
      context.rect(x, y, w, h);
    }
    context.fill();
  }

  function drawEyes(box) {
    var spots = {
      right: [[0.68, 0.32], [0.68, 0.68]],
      left: [[0.32, 0.32], [0.32, 0.68]],
      up: [[0.32, 0.32], [0.68, 0.32]],
      down: [[0.32, 0.68], [0.68, 0.68]],
    };
    var pair = spots[game.direction] || spots.right;
    ctx.fillStyle = "#2b2118";
    pair.forEach(function (spot) {
      ctx.beginPath();
      ctx.arc(box.x + box.size * spot[0], box.y + box.size * spot[1], Math.max(1.5, box.size * 0.08), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function frame(now) {
    if (!lastFrame) lastFrame = now;
    var delta = now - lastFrame;
    if (delta > 250) delta = 250;
    lastFrame = now;
    if (game.status === "running") {
      accumulator += delta;
      if (accumulator >= SnakeLogic.stepMs(game.score)) {
        accumulator = 0;
        var result = SnakeLogic.tick(game);
        if (result.ate) beep(640, 0.07);
        if (result.won) {
          beep(880, 0.14);
          rememberBest();
          syncOverlay();
        } else if (result.died) {
          endReason = result.reason;
          beep(150, 0.18, "triangle");
          rememberBest();
          syncOverlay();
        }
      }
    }
    draw();
    window.requestAnimationFrame(frame);
  }

  function onKey(event) {
    var dir = KEY_DIRS[event.key];
    if (dir) {
      event.preventDefault();
      steer(dir);
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (game.status === "running") {
        SnakeLogic.pause(game);
        syncOverlay();
      } else if (game.status === "paused") {
        begin();
      } else if (game.status === "idle") {
        dismissIntro();
      }
      return;
    }
    if (event.code === "Enter" && game.status !== "running") {
      event.preventDefault();
      if (game.status === "idle") dismissIntro();
      else begin();
    }
  }

  document.querySelectorAll("[data-dir]").forEach(function (button) {
    button.addEventListener("click", function () {
      button.blur();
      steer(button.getAttribute("data-dir"));
    });
  });

  actionButton.addEventListener("click", function () {
    actionButton.blur();
    if (game.status === "idle") dismissIntro();
    else begin();
  });
  soundButton.addEventListener("click", function () {
    soundButton.blur();
    toggleSound();
  });

  canvas.addEventListener("pointerdown", function (event) {
    pointer = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("pointerup", function (event) {
    if (!pointer) return;
    var dx = event.clientX - pointer.x;
    var dy = event.clientY - pointer.y;
    pointer = null;
    if (Math.hypot(dx, dy) < 28) return;
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? "right" : "left");
    else steer(dy > 0 ? "down" : "up");
  });
  canvas.addEventListener("pointercancel", function () {
    pointer = null;
  });

  window.addEventListener("keydown", onKey);
  renderScores();
  syncOverlay();
  window.requestAnimationFrame(frame);
})();
