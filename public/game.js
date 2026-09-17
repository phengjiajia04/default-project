(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const el = {
    hud: document.getElementById("hud"),
    score: document.getElementById("score"),
    combo: document.getElementById("combo"),
    level: document.getElementById("level"),
    lives: document.getElementById("lives"),
    menu: document.getElementById("menu"),
    best: document.getElementById("best"),
    startBtn: document.getElementById("startBtn"),
    gameover: document.getElementById("gameover"),
    rank: document.getElementById("rank"),
    finalScore: document.getElementById("finalScore"),
    newBest: document.getElementById("newBest"),
    restartBtn: document.getElementById("restartBtn"),
  };

  const VEG = [
    { c: "🥕", color: "#ff8c42" },
    { c: "🍅", color: "#ff4d4d" },
    { c: "🥦", color: "#4caf50" },
    { c: "🥒", color: "#6ab04c" },
    { c: "🌽", color: "#f7d154" },
    { c: "🍄", color: "#d9b38c" },
    { c: "🫑", color: "#2ecc71" },
    { c: "🍆", color: "#9b5de5" },
  ];
  const BOMB = { c: "💣", color: "#3b3b3b" };
  const RANKS = ["菜鳥新廚", "廚房助手", "專業小當家", "切菜達人", "米其林兇手"];

  const SW = window.innerWidth;
  const SH = window.innerHeight;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const BOARD_Y = SH * 0.66;
  const MAX_LIVES = 3;
  const SPAWN_X_MARGIN = 60;
  const MIN_SPACING = 74;

  let playing = false;
  let score = 0;
  let combo = 0;
  let comboTimer = 0;
  let level = 1;
  let lives = MAX_LIVES;
  let best = Number(localStorage.getItem("knife-kitchen-best") || 0);
  let vegs = [];
  let parts = [];
  let floats = [];
  let spawnTimer = 0;
  let shake = 0;
  let flash = 0;
  let lastTime = performance.now();
  let slices = [];
  let audio = null;

  const hearts = () => "♥".repeat(Math.max(lives, 0)) + "♡".repeat(Math.max(MAX_LIVES - lives, 0));

  function setupCanvas() {
    canvas.width = SW * DPR;
    canvas.height = SH * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function resetGame() {
    score = 0;
    combo = 0;
    comboTimer = 0;
    level = 1;
    lives = MAX_LIVES;
    vegs = [];
    parts = [];
    floats = [];
    slices = [];
    spawnTimer = 1;
    updateHud();
    el.menu.classList.add("hidden");
    el.gameover.classList.add("hidden");
    el.hud.classList.remove("hidden");
    playing = true;
  }

  function updateHud() {
    el.score.textContent = score;
    el.combo.textContent = "x" + combo;
    el.level.textContent = level;
    el.lives.textContent = hearts();
  }

  function getDifficulty() {
    return {
      targetCount: Math.min(2 + level, 9),
      fallSpeed: 130 + level * 22,
      lifetime: Math.max(2.4, 4.6 - level * 0.18),
      bombChance: Math.min(0.28, level * 0.045),
    };
  }

  function spawnVeg() {
    const d = getDifficulty();
    let x = SPAWN_X_MARGIN + Math.random() * (SW - SPAWN_X_MARGIN * 2);
    for (let i = 0; i < 12; i++) {
      const clash = vegs.some(
        (v) => v.state !== "falling" && Math.abs(v.x - x) < MIN_SPACING
      );
      if (!clash) break;
      x = SPAWN_X_MARGIN + Math.random() * (SW - SPAWN_X_MARGIN * 2);
    }
    const isBomb = Math.random() < d.bombChance && level >= 2;
    const base = isBomb ? BOMB : VEG[(Math.random() * VEG.length) | 0];
    vegs.push({
      emoji: base.c,
      color: base.color,
      x,
      y: -60,
      vy: isBomb ? d.fallSpeed * 0.8 : d.fallSpeed,
      radius: 30,
      state: "falling",
      timer: d.lifetime,
      born: performance.now(),
      bomb: isBomb,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function trySpawn(delta) {
    const d = getDifficulty();
    const alive = vegs.filter((v) => v.state !== "cut").length;
    if (alive >= d.targetCount) return;
    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      spawnVeg();
      spawnTimer = 0.5 + Math.random() * 0.9;
    }
  }

  function chopVeg(v) {
    v.state = "cut";
    score += 10 + combo * 5;
    combo += 1;
    comboTimer = 1.5;
    spawnParticles(v);
    slices.push({ x: v.x, y: v.y, age: 0 });
    floats.push({
      x: v.x,
      y: v.y - 20,
      text: "+" + (10 + combo * 5),
      color: "#ffe9c9",
      age: 0,
    });
    playChop();
    checkLevelUp();
  }

  function checkLevelUp() {
    if (score >= level * 60) {
      level += 1;
      playLevelUp();
      floats.push({
        x: SW / 2,
        y: SH * 0.3,
        text: "LEVEL " + level + " 🔥",
        color: "#ffb03a",
        age: 0,
        big: true,
      });
    }
  }

  function missVeg(v) {
    v.state = "gone";
    combo = 0;
    loseLife();
    floats.push({
      x: v.x,
      y: v.y - 20,
      text: v.bomb ? "別切炸彈！💥" : "爛掉了！",
      color: "#ff6b6b",
      age: 0,
    });
    if (v.bomb) {
      burst(v.x, v.y, "#ff8c42", 26);
      playBomb();
      shake = 24;
      flash = 0.35;
    } else {
      playMiss();
    }
  }

  function loseLife() {
    lives -= 1;
    updateHud();
    if (lives <= 0) gameOver();
  }

  function gameOver() {
    playing = false;
    if (score > best) {
      best = score;
      localStorage.setItem("knife-kitchen-best", String(best));
      el.newBest.classList.remove("hidden");
    } else {
      el.newBest.classList.add("hidden");
    }
    el.finalScore.textContent = score;
    const rank = RANKS[Math.min(RANKS.length - 1, (score / 120) | 0)];
    el.rank.textContent = rank;
    el.hud.classList.add("hidden");
    el.gameover.classList.remove("hidden");
    playGameOver();
  }

  function spawnParticles(v) {
    const n = v.bomb ? 20 : 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 220;
      parts.push({
        x: v.x,
        y: v.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        r: 2.5 + Math.random() * 4,
        color: v.color,
        age: 0,
        life: 0.5 + Math.random() * 0.5,
      });
    }
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 260;
      parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 3 + Math.random() * 5,
        color,
        age: 0,
        life: 0.6 + Math.random() * 0.5,
      });
    }
  }

  function hitTest(px, py) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const v of vegs) {
      if (v.state !== "ready") continue;
      const d = Math.hypot(px - v.x, py - v.y);
      if (d < v.radius + 16 && d < nearestDist) {
        nearest = v;
        nearestDist = d;
      }
    }
    return nearest;
  }

  function onPointer(e) {
    if (!playing) return;
    if (!audio) audio = createAudio();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const v = hitTest(px, py);
    if (v) chopVeg(v);
    else {
      burst(px, py, "#ffffff", 3);
      playWhoosh();
    }
  }

  function update(delta) {
    const d = getDifficulty();
    trySpawn(delta);

    comboTimer -= delta;
    if (comboTimer <= 0 && combo > 0) {
      combo = 0;
      updateHud();
    }

    for (const v of vegs) {
      v.wobble += delta * 6;
      if (v.state === "falling") {
        v.y += v.vy * delta;
        if (v.y >= BOARD_Y) {
          v.y = BOARD_Y;
          v.state = "ready";
          v.timer = d.lifetime;
        }
      } else if (v.state === "ready") {
        v.timer -= delta;
        if (v.timer <= 0) missVeg(v);
      }
    }
    vegs = vegs.filter((v) => v.state !== "cut" && v.state !== "gone");

    for (const p of parts) {
      p.age += delta;
      p.vy += 480 * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
    }
    parts = parts.filter((p) => p.age < p.life);

    for (const f of floats) {
      f.age += delta;
      f.y -= 46 * delta;
    }
    floats = floats.filter((f) => f.age < 1.1);

    for (const s of slices) s.age += delta;
    slices = slices.filter((s) => s.age < 0.35);

    if (shake > 0) shake = Math.max(0, shake - delta * 60);
    if (flash > 0) flash = Math.max(0, flash - delta);
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, "#241a14");
    g.addColorStop(0.55, "#33241a");
    g.addColorStop(1, "#1c1310");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SW, SH);

    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + 31) % SW;
      const y = (i * 53 + 17) % SH;
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = "#ffd9a0";
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBoard() {
    ctx.save();
    ctx.translate(0, BOARD_Y);
    const w = SW - 40;
    const shadow = ctx.createLinearGradient(0, 0, 0, 34);
    shadow.addColorStop(0, "#8a5a2b");
    shadow.addColorStop(1, "#5a3a1a");
    ctx.fillStyle = shadow;
    roundRect(-w / 2 + 20, -8, w - 40, 34, 12);
    ctx.fill();
    ctx.fillStyle = "#a9743a";
    roundRect(-w / 2 + 20, 0, w - 40, 22, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    for (let sx = -w / 2 + 40; sx < w / 2; sx += 46) {
      ctx.beginPath();
      ctx.moveTo(sx, 18);
      ctx.lineTo(sx + 14, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawVegs() {
    for (const v of vegs) {
      if (v.state === "cut") continue;
      const wob = Math.sin(v.wobble) * 3;
      ctx.save();
      ctx.translate(v.x, v.y);
      const pulse = v.state === "ready" && v.timer < 1 ? 1 + Math.sin(v.wobble * 3) * 0.05 : 1;
      ctx.scale(pulse, pulse);

      if (v.state === "ready") {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(0, 16, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (v.bomb) {
        ctx.rotate(v.state === "falling" ? v.x * 0.01 : 0);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ff5252";
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 35 + Math.sin(v.wobble * 4) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.font = "52px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.emoji, 0 + wob, 0);

      if (v.state === "ready") {
        const frac = Math.max(v.timer / getDifficulty().lifetime, 0);
        const barW = 46;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        roundRect(-barW / 2, 26, barW, 6, 3);
        ctx.fill();
        ctx.fillStyle = frac > 0.4 ? "#6fd96f" : "#ff6b6b";
        roundRect(-barW / 2, 26, barW * frac, 6, 3);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParts() {
    for (const p of parts) {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * Math.max(0.3, a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSlices() {
    for (const s of slices) {
      const t = s.age / 0.35;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x - 34 * (1 - t), s.y - 34 * (1 - t));
      ctx.lineTo(s.x + 34 * (1 - t), s.y + 34 * (1 - t));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats() {
    for (const f of floats) {
      const a = f.age < 0.15 ? f.age / 0.15 : Math.max(0, 1 - (f.age - 0.15) / 0.95);
      ctx.globalAlpha = a;
      ctx.font = f.big ? "bold 42px system-ui" : "bold 22px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(f.text, f.x + 2, f.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.save();
    if (shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * shake * 0.4,
        (Math.random() - 0.5) * shake * 0.4
      );
    }
    drawBackground();
    drawBoard();
    drawVegs();
    drawSlices();
    drawParts();
    drawFloats();
    ctx.restore();

    if (flash > 0) {
      ctx.globalAlpha = flash;
      ctx.fillStyle = "#ff3b30";
      ctx.fillRect(0, 0, SW, SH);
      ctx.globalAlpha = 1;
    }
  }

  function loop(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (playing) update(delta);
    draw();
    requestAnimationFrame(loop);
  }

  function createAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
    return { ac, master };
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!audio) return;
    const { ac, master } = audio;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ac.currentTime + dur);
  }

  function playChop() {
    tone(280 + combo * 45, 0.09, "triangle", 0.5);
    tone(140, 0.06, "sine", 0.35);
  }

  function playWhoosh() {
    tone(700, 0.05, "sine", 0.15, 200);
  }

  function playMiss() {
    tone(220, 0.25, "sawtooth", 0.35, 90);
  }

  function playBomb() {
    tone(120, 0.4, "sawtooth", 0.55, 40);
    tone(60, 0.5, "square", 0.4, 30);
  }

  function playLevelUp() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone(f, 0.12, "triangle", 0.4), i * 90)
    );
  }

  function playGameOver() {
    [392, 330, 262, 196, 131].forEach((f, i) =>
      setTimeout(() => tone(f, 0.22, "sawtooth", 0.3), i * 140)
    );
  }

  function start() {
    if (!audio) audio = createAudio();
    resetGame();
  }

  setupCanvas();
  el.best.textContent = best;
  el.startBtn.addEventListener("click", start);
  el.restartBtn.addEventListener("click", start);
  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") start();
  });
  window.addEventListener("resize", () => window.location.reload());

  requestAnimationFrame((t) => {
    lastTime = t;
    requestAnimationFrame(loop);
  });
})();