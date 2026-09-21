(function () {
  'use strict';

  // =========================================================
  //  ДОСТАВКА ДРАНИКОВ: КИБЕРПАНК ГРОДНО
  //  Чистый Canvas API + Web Audio API, без внешних библиотек.
  // =========================================================

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var W = canvas.width;   // 900
  var H = canvas.height;  // 600
  var GROUND_Y = 480;

  // ---------------------------------------------------------
  //  ЗВУК (Web Audio API)
  // ---------------------------------------------------------

  var audioCtx = null;
  var masterGain = null;
  var musicGain = null;
  var sfxGain = null;
  var musicSchedulerId = null;
  var musicIndex = 0;
  var nextNoteTime = 0;

  var NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  function noteFreq(name) {
    if (!name) return null;
    var m = /^([A-G]#?)(\d)$/.exec(name);
    if (!m) return null;
    var semitone = NOTE_INDEX[m[1]];
    var octave = parseInt(m[2], 10);
    var midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Бодрая мажорная 8-битная тема: скачущие стаккато-арпеджио
  // (I-I-IV-V-vi-IV-V-I), быстрый темп — под настроение весёлой доставки.
  var TEMPO = 150;
  var BEAT = 60 / TEMPO;
  var MELODY = [
    ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['C5', 0.5], ['G4', 0.5], ['E4', 0.5], ['C4', 0.5], [null, 0.5],
    ['E4', 0.5], ['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['G4', 0.5], ['E4', 0.5], [null, 0.5],
    ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['F5', 0.5], ['C5', 0.5], ['A4', 0.5], ['F4', 0.5], [null, 0.5],
    ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['D5', 0.5], ['B4', 0.5], ['G4', 0.5], [null, 0.5],
    ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 0.5], [null, 0.5],
    ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['F5', 0.5], ['C5', 0.5], ['A4', 0.5], ['F4', 0.5], [null, 0.5],
    ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], [null, 0.5],
    ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['C4', 0.5], ['C4', 1]
  ];

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.22;
    musicGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);
  }

  function scheduleNote(freq, time, dur) {
    if (!freq) return;
    var osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.9, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.92);

    osc.connect(g);
    g.connect(musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function musicScheduleAhead() {
    while (nextNoteTime < audioCtx.currentTime + 0.25) {
      var note = MELODY[musicIndex];
      var dur = note[1] * BEAT;
      scheduleNote(noteFreq(note[0]), nextNoteTime, dur);
      nextNoteTime += dur;
      musicIndex = (musicIndex + 1) % MELODY.length;
    }
  }

  function startMusic() {
    if (!audioCtx) return;
    stopMusic();
    musicIndex = 0;
    nextNoteTime = audioCtx.currentTime + 0.05;
    musicScheduleAhead();
    musicSchedulerId = setInterval(musicScheduleAhead, 60);
  }

  function stopMusic() {
    if (musicSchedulerId) {
      clearInterval(musicSchedulerId);
      musicSchedulerId = null;
    }
  }

  function playJump() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.17);
  }

  function playThrow() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.09);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.11);
  }

  function playEmptyClick() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.07);
  }

  function playHit() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    [880, 1320].forEach(function (f, i) {
      var start = t + i * 0.06;
      var osc = audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, start);
      var g = audioCtx.createGain();
      g.gain.setValueAtTime(0.35, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(g); g.connect(sfxGain);
      osc.start(start); osc.stop(start + 0.13);
    });
  }

  function playPickup() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    [523.25, 659.25, 783.99].forEach(function (f, i) {
      var start = t + i * 0.045;
      var osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, start);
      var g = audioCtx.createGain();
      g.gain.setValueAtTime(0.3, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      osc.connect(g); g.connect(sfxGain);
      osc.start(start); osc.stop(start + 0.12);
    });
  }

  function playShield() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 0.25);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.31);
  }

  function playShieldBreak() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.23);
  }

  function playExplosion() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;

    var bufferSize = Math.floor(audioCtx.sampleRate * 0.4);
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    var noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.4);
    var ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.8, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    noise.connect(filter); filter.connect(ng); ng.connect(sfxGain);
    noise.start(t); noise.stop(t + 0.45);

    var osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    var og = audioCtx.createGain();
    og.gain.setValueAtTime(0.6, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(og); og.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.41);
  }

  // ---------------------------------------------------------
  //  СОСТОЯНИЕ ИГРЫ
  // ---------------------------------------------------------

  var STATE_READY = 'ready';
  var STATE_PLAYING = 'playing';
  var STATE_OVER = 'over';

  var state = STATE_READY;

  var GRAVITY = 2300;
  var JUMP_VELOCITY = -840;
  var PLAYER_X = 170;
  var PLAYER_W = 46;
  var PLAYER_H = 44;
  var BASE_SPEED = 230;
  var MAX_SPEED = 430;
  var SHIELD_DURATION = 8;

  var player, money, draniki, scrollSpeed, elapsed;
  var obstacles, shops, people, sacks, projectiles, particles;
  var distSinceObstacle, nextObstacleGap;
  var OBSTACLE_TYPES = ['pothole', 'fence', 'courier'];
  var distSinceShop, nextShopGap;
  var shopOrder = ['EUROOPT', 'MILA', 'GEMMA'];
  var shopOrderIndex = 0;
  var screenShake = 0;
  var bgOffset = 0;
  var roadDashOffset = 0;

  var roadDecor, distSinceDecor, nextDecorGap;
  var DECOR_PARALLAX = 0.6;
  var DECOR_TYPES = ['lamp', 'tree', 'tree'];

  function randRange(a, b) { return a + Math.random() * (b - a); }
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Фоновый дождь — атмосферный слой, идёт всегда (даже на стартовом экране)
  var RAIN_COUNT = 70;
  var rain = [];
  for (var ri = 0; ri < RAIN_COUNT; ri++) {
    rain.push({
      x: Math.random() * W, y: Math.random() * GROUND_Y,
      len: 10 + Math.random() * 14, speed: 260 + Math.random() * 180
    });
  }

  function updateRain(dt) {
    for (var i = 0; i < rain.length; i++) {
      var r = rain[i];
      r.y += r.speed * dt;
      r.x -= r.speed * 0.22 * dt;
      if (r.y > GROUND_Y || r.x < -10) {
        r.y = -10;
        r.x = Math.random() * W;
      }
    }
  }

  function drawRain() {
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.32)';
    ctx.lineWidth = 1;
    for (var i = 0; i < rain.length; i++) {
      var r = rain[i];
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.len * 0.25, r.y - r.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Процедурный силуэт панелек (фикс. массив, тайлится по ширине PATTERN_W)
  var PATTERN_W = 900;
  var BUILDINGS = buildSkyline();
  function buildSkyline() {
    var arr = [];
    var x = 0;
    var seed = 1;
    function rnd() { // простой детерминированный псевдослучайный генератор
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    while (x < PATTERN_W) {
      var w = 70 + rnd() * 60;
      var h = 90 + rnd() * 150;
      var windows = [];
      var cols = Math.max(2, Math.floor(w / 16));
      var rows = Math.max(2, Math.floor(h / 20));
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (rnd() < 0.35) {
            windows.push({ c: c, r: r, color: rnd() < 0.5 ? '#ffd76a' : '#5ef0ff' });
          }
        }
      }
      arr.push({ x: x, w: w, h: h, cols: cols, rows: rows, windows: windows });
      x += w + 6 + rnd() * 14;
    }
    return arr;
  }

  function resetGame() {
    player = {
      x: PLAYER_X, y: GROUND_Y - PLAYER_H, w: PLAYER_W, h: PLAYER_H,
      vy: 0, onGround: true,
      shielded: false, shieldTimer: 0,
      throwFlash: 0, jumpAnim: 0, landAnim: 0, runCycle: 0
    };
    money = 0;
    draniki = 10;
    scrollSpeed = BASE_SPEED;
    elapsed = 0;

    obstacles = [];
    shops = [];
    people = [];
    sacks = [];
    projectiles = [];
    particles = [];
    roadDecor = [];

    distSinceObstacle = 0;
    nextObstacleGap = randRange(340, 520);
    distSinceShop = 0;
    nextShopGap = randRange(420, 560);
    shopOrderIndex = Math.floor(Math.random() * shopOrder.length);
    distSinceDecor = 0;
    nextDecorGap = randRange(160, 260);

    screenShake = 0;
    bgOffset = 0;
    roadDashOffset = 0;
  }

  resetGame();

  // ---------------------------------------------------------
  //  СПАВН ОБЪЕКТОВ
  // ---------------------------------------------------------

  function spawnObstacle() {
    var type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];

    if (type === 'pothole') {
      var pw = randRange(46, 78);
      obstacles.push({ type: type, x: W + 20, y: GROUND_Y - 6, w: pw, h: 16, handled: false });
    } else if (type === 'fence') {
      var fh = randRange(58, 88);
      obstacles.push({ type: type, x: W + 20, y: GROUND_Y - fh, w: 30, h: fh, handled: false });
    } else { // courier
      var ch = 46;
      obstacles.push({ type: type, x: W + 20, y: GROUND_Y - ch, w: 30, h: ch, handled: false, bob: Math.random() * Math.PI * 2 });
    }
  }

  function spawnRoadDecor() {
    var type = DECOR_TYPES[Math.floor(Math.random() * DECOR_TYPES.length)];
    if (type === 'lamp') {
      roadDecor.push({
        type: type, x: W + 20,
        flicker: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? '#5adcff' : '#ff5ad1'
      });
    } else {
      roadDecor.push({
        type: type, x: W + 20,
        scale: 0.8 + Math.random() * 0.5
      });
    }
  }

  function spawnShop() {
    var type = shopOrder[shopOrderIndex % shopOrder.length];
    shopOrderIndex++;

    var w = 150, h = 150 + randRange(0, 60);
    var shop = {
      type: type, x: W + 20, y: GROUND_Y - h, w: w, h: h,
      triggered: false
    };
    shops.push(shop);

    if (type === 'EUROOPT') {
      var count = 1 + Math.floor(Math.random() * 2);
      for (var i = 0; i < count; i++) {
        var ph = 40;
        people.push({
          x: shop.x + shop.w + 20 + i * 34, y: GROUND_Y - ph, w: 22, h: ph, alive: true
        });
      }
    } else if (type === 'GEMMA') {
      var sc = 2 + Math.floor(Math.random() * 2);
      for (var j = 0; j < sc; j++) {
        var floatH = j % 2 === 0 ? 70 : 150;
        sacks.push({
          x: shop.x + 30 + j * 58, y: GROUND_Y - floatH, w: 26, h: 22,
          baseY: GROUND_Y - floatH, phase: Math.random() * Math.PI * 2, collected: false
        });
      }
    }
  }

  function spawnParticle(x, y, text, color) {
    particles.push({ x: x, y: y, text: text, color: color, life: 1, vy: -46 });
  }

  function throwDranik() {
    if (state !== STATE_PLAYING) return;
    if (draniki <= 0) { playEmptyClick(); return; }
    draniki--;
    projectiles.push({
      x: player.x + player.w, y: player.y + player.h * 0.3,
      vx: 560, vy: -160, w: 16, h: 12, active: true
    });
    playThrow();
  }

  function doJump() {
    if (state !== STATE_PLAYING) return;
    if (player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      player.jumpAnim = 1;
      playJump();
    }
  }

  function activateShield() {
    player.shielded = true;
    player.shieldTimer = SHIELD_DURATION;
    playShield();
  }

  function triggerGameOver() {
    state = STATE_OVER;
    stopMusic();
    screenShake = 0.5;
    playExplosion();
  }

  function startGame() {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    resetGame();
    state = STATE_PLAYING;
    startMusic();
  }

  function restartGame() {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    resetGame();
    state = STATE_PLAYING;
    startMusic();
  }

  // ---------------------------------------------------------
  //  ВВОД
  // ---------------------------------------------------------

  var JUMP_KEYS = { ArrowUp: 1, KeyW: 1, Space: 1 };
  var THROW_KEYS = { KeyE: 1, Enter: 1 };

  window.addEventListener('keydown', function (e) {
    if (JUMP_KEYS[e.code] || THROW_KEYS[e.code]) e.preventDefault();

    if (state === STATE_READY) {
      startGame();
      return;
    }
    if (state === STATE_OVER) {
      if (e.code === 'Enter') restartGame();
      return;
    }
    // state === STATE_PLAYING
    if (JUMP_KEYS[e.code]) doJump();
    if (THROW_KEYS[e.code]) throwDranik();
  });

  function handleControlTap(action) {
    if (state === STATE_READY) { startGame(); return; }
    if (state === STATE_OVER) { restartGame(); return; }
    action();
  }

  function bindTapControl(el, action) {
    if (!el) return;
    var handler = function (e) {
      e.preventDefault();
      handleControlTap(action);
    };
    el.addEventListener('touchstart', handler, { passive: false });
    el.addEventListener('mousedown', handler);
  }

  bindTapControl(canvas, doJump);
  bindTapControl(document.getElementById('btnJump'), doJump);
  bindTapControl(document.getElementById('btnThrow'), throwDranik);

  // ---------------------------------------------------------
  //  АДАПТИВНЫЙ МАСШТАБ (под маленькие/мобильные экраны)
  // ---------------------------------------------------------

  function fitStage() {
    var stage = document.getElementById('stage');
    var tv = document.querySelector('.tv-container');
    if (!stage || !tv) return;

    tv.style.transform = 'none';
    var naturalW = tv.offsetWidth;
    var naturalH = tv.offsetHeight;

    var bodyStyle = window.getComputedStyle(document.body);
    var vPadding = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);

    // Высота описания намеренно не учитывается: телевизор всегда старается
    // показаться в полный (или ограниченный шириной) размер, а если вместе
    // с описанием он не помещается в окно — страница просто прокручивается.
    var margin = 16;
    var availW = window.innerWidth - margin;
    var availH = window.innerHeight - vPadding - margin;
    var scale = Math.min(1, availW / naturalW, availH / naturalH);

    tv.style.transform = 'scale(' + scale + ')';
    stage.style.width = Math.round(naturalW * scale) + 'px';
    stage.style.height = Math.round(naturalH * scale) + 'px';
  }

  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', fitStage);
  fitStage();

  // ---------------------------------------------------------
  //  ОБНОВЛЕНИЕ
  // ---------------------------------------------------------

  function update(dt) {
    updateRain(dt);

    if (state !== STATE_PLAYING) {
      updateParticles(dt);
      return;
    }

    elapsed += dt;
    scrollSpeed = Math.min(MAX_SPEED, BASE_SPEED + elapsed * 4.2);
    var moveDist = scrollSpeed * dt;

    bgOffset = (bgOffset + moveDist * 0.28) % PATTERN_W;
    roadDashOffset = (roadDashOffset + moveDist) % 48;

    // --- игрок: физика прыжка ---
    var wasOnGround = player.onGround;
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    if (player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
    if (!wasOnGround && player.onGround) player.landAnim = 1;
    if (player.jumpAnim > 0) player.jumpAnim = Math.max(0, player.jumpAnim - dt * 2);
    if (player.landAnim > 0) player.landAnim = Math.max(0, player.landAnim - dt * 5);
    if (player.onGround) player.runCycle += dt * (4 + scrollSpeed * 0.02);

    if (player.shielded) {
      player.shieldTimer -= dt;
      if (player.shieldTimer <= 0) player.shielded = false;
    }
    if (player.throwFlash > 0) player.throwFlash -= dt;

    // --- спавн препятствий (ямы, заборы, курьеры-конкуренты) ---
    distSinceObstacle += moveDist;
    if (distSinceObstacle >= nextObstacleGap) {
      spawnObstacle();
      distSinceObstacle = 0;
      nextObstacleGap = randRange(300, 560);
    }

    // --- спавн магазинов ---
    distSinceShop += moveDist;
    if (distSinceShop >= nextShopGap) {
      spawnShop();
      distSinceShop = 0;
      nextShopGap = randRange(560, 820);
    }

    // --- спавн фонарей и деревьев (средний слой параллакса) ---
    distSinceDecor += moveDist;
    if (distSinceDecor >= nextDecorGap) {
      spawnRoadDecor();
      distSinceDecor = 0;
      nextDecorGap = randRange(160, 260);
    }
    roadDecor.forEach(function (d) { d.x -= moveDist * DECOR_PARALLAX; if (d.type === 'lamp') d.flicker += dt * 3; });
    roadDecor = roadDecor.filter(function (d) { return d.x > -40; });

    // --- сдвиг мира ---
    moveAndPrune(obstacles, moveDist);
    moveAndPrune(shops, moveDist);
    moveAndPrune(people, moveDist);
    obstacles.forEach(function (o) { if (o.type === 'courier') o.bob += dt * 10; });
    sacks.forEach(function (s) { s.x -= moveDist; s.phase += dt * 3; s.y = s.baseY + Math.sin(s.phase) * 8; });
    sacks = sacks.filter(function (s) { return s.x + s.w > -40 && !s.collected; });

    // --- магазин МИЛА: триггер щита ---
    for (var mi = 0; mi < shops.length; mi++) {
      var sh = shops[mi];
      if (sh.type === 'MILA' && !sh.triggered) {
        if (sh.x <= player.x + player.w && sh.x + sh.w >= player.x) {
          sh.triggered = true;
          activateShield();
        }
      }
    }

    // --- препятствия: столкновение ---
    for (var pi = 0; pi < obstacles.length; pi++) {
      var hole = obstacles[pi];
      if (hole.handled) continue;
      if (rectsOverlap(player, hole)) {
        hole.handled = true;
        if (player.shielded) {
          player.shielded = false;
          player.shieldTimer = 0;
          playShieldBreak();
          spawnParticle(player.x + player.w / 2, player.y, 'ЩЫТ!', '#ff7ad9');
        } else {
          triggerGameOver();
        }
      }
    }

    // --- снаряды (драники) ---
    projectiles.forEach(function (p) {
      p.vy += GRAVITY * 0.35 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y >= GROUND_Y) p.active = false; // упал на асфальт
    });
    projectiles = projectiles.filter(function (p) { return p.active && p.x < W + 40; });

    // --- попадание в людей ---
    for (var qi = 0; qi < projectiles.length; qi++) {
      var pr = projectiles[qi];
      if (!pr.active) continue;
      for (var ri = 0; ri < people.length; ri++) {
        var per = people[ri];
        if (per.alive && rectsOverlap(pr, per)) {
          per.alive = false;
          pr.active = false;
          money += 500;
          playHit();
          spawnParticle(per.x, per.y - 10, '+500 BYN', '#5bff8a');
          break;
        }
      }
    }
    people = people.filter(function (p) { return p.alive; });

    // --- сбор мешков картошки ---
    sacks.forEach(function (s) {
      if (!s.collected && rectsOverlap(player, s)) {
        s.collected = true;
        draniki += 5;
        playPickup();
        spawnParticle(s.x, s.y - 6, '+5 ДРАНІКОЎ', '#ffd23f');
      }
    });

    updateParticles(dt);

    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 1.5);
  }

  function updateParticles(dt) {
    particles.forEach(function (pt) {
      pt.life -= dt * 1.1;
      pt.y += pt.vy * dt;
    });
    particles = particles.filter(function (pt) { return pt.life > 0; });
  }

  function moveAndPrune(arr, moveDist) {
    for (var i = 0; i < arr.length; i++) arr[i].x -= moveDist;
    for (var i2 = arr.length - 1; i2 >= 0; i2--) {
      if (arr[i2].x + arr[i2].w < -60) arr.splice(i2, 1);
    }
  }

  // ---------------------------------------------------------
  //  ОТРИСОВКА
  // ---------------------------------------------------------

  function draw() {
    ctx.save();
    if (screenShake > 0) {
      var sx = (Math.random() - 0.5) * screenShake * 14;
      var sy = (Math.random() - 0.5) * screenShake * 14;
      ctx.translate(sx, sy);
    }

    drawSky();
    drawSkyline(bgOffset);
    drawRain();
    roadDecor.forEach(drawRoadDecorItem);
    drawRoad();

    shops.forEach(drawShop);
    obstacles.forEach(drawObstacle);
    sacks.forEach(drawSack);
    people.forEach(drawPerson);
    drawPlayer();
    projectiles.forEach(drawProjectile);
    particles.forEach(drawParticle);

    drawHUD();

    ctx.restore();

    if (state === STATE_READY) drawReadyOverlay();
    if (state === STATE_OVER) drawGameOverOverlay();
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#160821');
    g.addColorStop(0.55, '#391150');
    g.addColorStop(1, '#7a1f5e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // неоновая "сетка" горизонта — киберпанк-штрих
    ctx.strokeStyle = 'rgba(255, 60, 200, 0.18)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 60) {
      ctx.beginPath();
      ctx.moveTo(gx, GROUND_Y - 90);
      ctx.lineTo(W / 2 + (gx - W / 2) * 0.15, GROUND_Y);
      ctx.stroke();
    }

    // луна
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(760, 90, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSkyline(offset) {
    drawSkylineAt(-offset);
    drawSkylineAt(-offset + PATTERN_W);
  }

  function drawSkylineAt(originX) {
    for (var i = 0; i < BUILDINGS.length; i++) {
      var b = BUILDINGS[i];
      var bx = originX + b.x;
      if (bx + b.w < -20 || bx > W + 20) continue;
      var by = GROUND_Y - b.h;
      ctx.fillStyle = '#1a1024';
      ctx.fillRect(bx, by, b.w, b.h);
      var cw = b.w / b.cols, ch = b.h / b.rows;
      for (var wi = 0; wi < b.windows.length; wi++) {
        var win = b.windows[wi];
        ctx.fillStyle = win.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(bx + win.c * cw + 3, by + win.r * ch + 3, cw - 6, ch - 6);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawRoad() {
    ctx.fillStyle = '#141018';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.fillStyle = '#2a2432';
    ctx.fillRect(0, GROUND_Y, W, 6);

    ctx.fillStyle = '#f2d94e';
    for (var x = -48 + roadDashOffset * -1; x < W; x += 48) {
      ctx.fillRect(x, GROUND_Y + 34, 24, 5);
    }

    ctx.fillStyle = 'rgba(255, 60, 200, 0.06)';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  }

  function drawRoadDecorItem(d) {
    if (d.type === 'lamp') drawStreetlamp(d);
    else drawTree(d);
  }

  function drawTree(t) {
    var s = t.scale;
    var trunkH = 30 * s;
    var baseY = GROUND_Y;

    ctx.fillStyle = '#241a12';
    ctx.fillRect(t.x - 3 * s, baseY - trunkH, 6 * s, trunkH);

    var cy = baseY - trunkH;
    ctx.fillStyle = '#16261c';
    ctx.beginPath();
    ctx.ellipse(t.x - 18 * s, cy - 8 * s, 16 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(t.x + 18 * s, cy - 8 * s, 16 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(t.x, cy - 26 * s, 26 * s, 24 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 120, 220, 0.10)';
    ctx.beginPath();
    ctx.ellipse(t.x - 8 * s, cy - 34 * s, 18 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStreetlamp(l) {
    var poleH = 130;
    var topY = GROUND_Y - poleH;

    ctx.fillStyle = '#332c42';
    ctx.fillRect(l.x - 2, topY, 4, poleH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(l.x - 2, topY, 1, poleH);
    ctx.fillStyle = '#332c42';
    ctx.fillRect(l.x - 2, topY - 3, 10, 3);

    var glow = 0.65 + Math.sin(l.flicker) * 0.25;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(l.x + 6, topY - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShop(shop) {
    var palette = {
      EUROOPT: { wall: '#0e2c22', neon: '#39ff8f', label: 'ЕВРООПТ' },
      MILA: { wall: '#2c0e26', neon: '#ff5ad1', label: 'МІЛА' },
      GEMMA: { wall: '#2c1e0e', neon: '#ffb23f', label: 'ГЕММА' }
    }[shop.type];

    ctx.fillStyle = palette.wall;
    ctx.fillRect(shop.x, shop.y, shop.w, shop.h);

    ctx.fillStyle = 'rgba(120, 200, 255, 0.25)';
    for (var wx = shop.x + 10; wx < shop.x + shop.w - 10; wx += 26) {
      for (var wy = shop.y + 16; wy < shop.y + shop.h - 20; wy += 30) {
        ctx.fillRect(wx, wy, 14, 16);
      }
    }

    // неоновая вывеска
    ctx.save();
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.shadowColor = palette.neon;
    ctx.shadowBlur = 14;
    ctx.fillStyle = palette.neon;
    ctx.fillRect(shop.x + 8, shop.y - 6, shop.w - 16, 26);
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(palette.label, shop.x + shop.w / 2, shop.y + 13, shop.w - 16);
    ctx.restore();

    // дверь
    ctx.fillStyle = '#05050a';
    ctx.fillRect(shop.x + shop.w / 2 - 16, shop.y + shop.h - 46, 32, 46);
  }

  function drawObstacle(o) {
    if (o.type === 'pothole') drawPothole(o);
    else if (o.type === 'fence') drawFence(o);
    else drawCourierObstacle(o);
  }

  function drawPothole(hole) {
    ctx.fillStyle = '#050408';
    ctx.beginPath();
    ctx.ellipse(hole.x + hole.w / 2, hole.y + hole.h / 2, hole.w / 2, hole.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a3440';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawFence(f) {
    ctx.fillStyle = '#221a10';
    ctx.fillRect(f.x, f.y, f.w, f.h);

    ctx.fillStyle = '#3c2e1a';
    var plankW = f.w / 3;
    for (var i = 0; i < 3; i++) {
      ctx.fillRect(f.x + i * plankW + 2, f.y, plankW - 4, f.h);
    }

    ctx.fillStyle = '#1a1310';
    ctx.fillRect(f.x - 3, f.y + f.h * 0.32, f.w + 6, 7);

    ctx.strokeStyle = '#0c0906';
    ctx.lineWidth = 2;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
  }

  function drawCourierObstacle(c) {
    ctx.save();
    ctx.translate(c.x, c.y);

    var legShift = Math.sin(c.bob) * 3;

    // ноги (шагающая анимация)
    ctx.fillStyle = '#1c1f28';
    ctx.fillRect(6 + legShift, c.h - 14, 7, 14);
    ctx.fillRect(c.w - 13 - legShift, c.h - 14, 7, 14);

    // тело — тёмная курьерская форма
    ctx.fillStyle = '#2b2f3a';
    ctx.fillRect(5, 16, c.w - 10, c.h - 30);

    // жёлтый рюкзак конкурентов
    ctx.save();
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-2, 13, 13, 20);
    ctx.strokeStyle = '#8a6400';
    ctx.lineWidth = 1;
    ctx.strokeRect(-2, 13, 13, 20);
    ctx.restore();

    // голова
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath();
    ctx.arc(c.w / 2, 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // тёмная кепка
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(c.w / 2, 5, 8, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }

  function drawSack(s) {
    if (s.collected) return;
    ctx.save();
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#c98a1f';
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(s.x + s.w / 2 - 6, s.y + s.h / 2 - 6, 12, 10);
    ctx.restore();
  }

  function drawPerson(p) {
    // плакат "ГОЛОДЕН!!!" — держит перед собой
    var signW = 50, signH = 26;
    var stickX = p.x + p.w - 3;
    var stickTopY = p.y - 26;

    ctx.save();
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(stickX, p.y + 8);
    ctx.lineTo(stickX, stickTopY);
    ctx.stroke();

    var signX = stickX - signW + 10;
    var signY = stickTopY - signH + 8;
    ctx.fillStyle = '#a9865a';
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX, signY, signW, signH);

    ctx.fillStyle = '#2a1f14';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('ГАЛОДНЫ', signX + signW / 2, signY + 12);
    ctx.fillText('!!!', signX + signW / 2, signY + 21);
    ctx.restore();

    ctx.fillStyle = '#8892b0';
    ctx.fillRect(p.x + 4, p.y + 12, p.w - 8, p.h - 12);
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(p.x + p.w / 2 - 6, p.y + 16, 12, 6);
  }

  function drawProjectile(pr) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.fillStyle = '#a5601f';
    ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = '#e2a94a';
    ctx.fillRect(-8, -6, 16, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(-2, -8); ctx.quadraticCurveTo(-6, -16, -2, -20);
    ctx.moveTo(3, -8); ctx.quadraticCurveTo(7, -16, 3, -20);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticle(pt) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life);
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = pt.color;
    ctx.textAlign = 'center';
    ctx.fillText(pt.text, pt.x, pt.y);
    ctx.restore();
  }

  function drawWheel(cx, cy, cycle) {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    var angle = cycle * 6;
    ctx.strokeStyle = '#4a4a55';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 6, cy + Math.sin(angle) * 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle + Math.PI) * 6, cy + Math.sin(angle + Math.PI) * 6);
    ctx.stroke();
  }

  function drawPlayer() {
    var p = player;
    ctx.save();
    ctx.translate(p.x, p.y);

    // сквош-стретч: якорь в нижнем центре, между колёсами
    var scaleY = (1 + p.jumpAnim * 0.16) * (1 - p.landAnim * 0.22);
    var scaleX = 1 + (1 - scaleY) * 0.5;
    ctx.translate(p.w / 2, p.h);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-p.w / 2, -p.h);

    if (p.shielded) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 100) * 0.15;
      ctx.fillStyle = '#ff7ad9';
      ctx.shadowColor = '#ff7ad9';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(p.w / 2, p.h / 2, p.w * 0.9, p.h * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    var lean = p.onGround ? 0 : -6;
    var bob = p.onGround ? Math.sin(p.runCycle * 2) * 1.4 : 0;

    // неоновая подсветка под самокатом
    ctx.fillStyle = 'rgba(90, 220, 255, 0.55)';
    ctx.shadowColor = '#5adcff';
    ctx.shadowBlur = 8;
    ctx.fillRect(2, p.h - 6, p.w - 4, 3);
    ctx.shadowBlur = 0;

    // колёса со спицами (крутятся при педалировании)
    drawWheel(8, p.h - 4, p.runCycle);
    drawWheel(p.w - 8, p.h - 4, p.runCycle);

    // дека самоката
    ctx.fillStyle = '#2b2b34';
    ctx.fillRect(4, p.h - 14, p.w - 8, 6);

    // руль/стойка
    ctx.strokeStyle = '#3a3a44';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.w - 12, p.h - 12);
    ctx.lineTo(p.w - 12 + lean, 6 + bob);
    ctx.stroke();
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(p.w - 22 + lean, 4 + bob, 16, 4);

    // курьер: тело (лёгкий bounce в такт педалированию)
    ctx.fillStyle = '#19c3d1';
    ctx.fillRect(10 + lean * 0.3, p.h - 34 + bob, 18, 22);
    // рюкзак-коробка драников
    ctx.fillStyle = '#c9781f';
    ctx.fillRect(2 + lean * 0.3, p.h - 32 + bob, 12, 16);
    ctx.strokeStyle = '#7a4610';
    ctx.strokeRect(2 + lean * 0.3, p.h - 32 + bob, 12, 16);
    // голова + шлем
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath();
    ctx.arc(20 + lean * 0.4, p.h - 38 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e23f6b';
    ctx.beginPath();
    ctx.arc(20 + lean * 0.4, p.h - 41 + bob, 8, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }

  function drawHUD() {
    ctx.save();
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(10, 10, 330, 60);

    ctx.fillStyle = '#5bff8a';
    ctx.shadowColor = '#5bff8a';
    ctx.shadowBlur = 6;
    ctx.fillText('ЗАРАБОТАНО: ' + money + ' BYN', 22, 34);

    ctx.fillStyle = '#ffd23f';
    ctx.shadowColor = '#ffd23f';
    ctx.fillText('ДРАНИКИ: ' + draniki, 22, 58);

    ctx.restore();
  }

  function drawReadyOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 10, 0.72)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5ad1';
    ctx.shadowColor = '#ff5ad1';
    ctx.shadowBlur = 16;
    ctx.font = "26px 'Press Start 2P', monospace";
    ctx.fillText('ДАСТАЎКА ДРАНІКАЎ', W / 2, 190);
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.fillStyle = '#5adcff';
    ctx.shadowColor = '#5adcff';
    ctx.fillText('КІБЕРПАНК ГРОДНА', W / 2, 224);

    ctx.shadowBlur = 0;
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillStyle = '#e6e6f0';
    ctx.fillText('ArrowUp / W / Пробел — прыжок цераз ямы', W / 2, 300);
    ctx.fillText('E / Enter — кінуць гарачы дранік', W / 2, 328);
    ctx.fillText('ЕВРООПТ: трапі ў чалавека = +500 BYN', W / 2, 366);
    ctx.fillText('МІЛА: шчыт ад адной перашкоды', W / 2, 390);
    ctx.fillText('ГЕММА: мяшкі бульбы = +5 дранікаў', W / 2, 414);

    if (Math.floor(performance.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('НАЖМІ ЛЮБУЮ КЛАВІШУ', W / 2, 470);
    }
    ctx.restore();
  }

  function drawGameOverOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 2, 8, 0.78)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3355';
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 18;
    ctx.font = "24px 'Press Start 2P', monospace";
    ctx.fillText('GAME OVER', W / 2, 230);

    ctx.shadowBlur = 0;
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillStyle = '#ffffff';
    wrapText('Ай, дранікі астылі! Паспрабуй яшчэ раз.', W / 2, 280, 720, 22);

    ctx.font = "13px 'Press Start 2P', monospace";
    ctx.fillStyle = '#5bff8a';
    ctx.fillText('ЗАРАБОТАНА: ' + money + ' BYN', W / 2, 360);

    if (Math.floor(performance.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#ffd23f';
      ctx.font = "13px 'Press Start 2P', monospace";
      ctx.fillText('ENTER — паспрабаваць яшчэ раз', W / 2, 420);
    }
    ctx.restore();
  }

  function wrapText(text, cx, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
    var lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        lines.push(line);
        line = words[i] + ' ';
      } else {
        line = test;
      }
    }
    lines.push(line);
    var startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j].trim(), cx, startY + j * lineHeight);
    }
  }

  // ---------------------------------------------------------
  //  ИГРОВОЙ ЦИКЛ
  // ---------------------------------------------------------

  var lastTime = null;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

})();
