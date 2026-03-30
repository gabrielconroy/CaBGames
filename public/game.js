var cats;

async function loadPuzzle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    document.getElementById("board").innerHTML = "<h2>No puzzle found</h2>";
    return;
  }

  try {
    const res = await fetch("/api/puzzle?id=" + encodeURIComponent(id));
    const puzzle = await res.json();

    cats = JSON.parse(puzzle.data);
	// Dynamically detect puzzle size
	const firstCategory = Object.values(cats)[0];

	if (!firstCategory || !Array.isArray(firstCategory)) {
		console.error("Invalid puzzle format");
		document.getElementById("board").innerHTML = "<h2>Invalid puzzle data</h2>";
	return;
}

M = firstCategory.length;

    loadState();

  } catch (err) {
    console.error(err);
    document.getElementById("board").innerHTML = "<h2>Failed to load puzzle</h2>";
  }
}


/* ================================
GAME ENGINE
================================ */

// Globals
var score = 0;
var mistakes = 0;
var COLS = 10;
var selectionHeld = false;
var selectedIdx = null; 
var gameState = []; 
var attemptedMistakes = new Set();

function updateSelectedUI(text) {
  document.getElementById("selected").textContent = text || "-";
}

function deselect() {
  selectedIdx = null;
  selectionHeld = false;
  document.getElementById("deselect").disabled = true;
  updateSelectedUI("");
  renderBoard();
}

function stringToLightColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 85%)`;
}

function saveState() {
  const id = new URLSearchParams(window.location.search).get("id");
  const key = (k) => `puzzle_${id}_${k}`;
  localStorage.setItem(key('score'), score + '');
  localStorage.setItem(key('mistakes'), mistakes + '');
  localStorage.setItem(key('attemptedMistakes'), JSON.stringify(Array.from(attemptedMistakes)));
  localStorage.setItem(key('gameState'), JSON.stringify(gameState));
}

function fitButtonText(){

  const buttons = document.querySelectorAll(".bigbut");

  buttons.forEach(btn => {

    let size = 14;
    btn.style.fontSize = size + "px";

    while (
      btn.scrollHeight > btn.clientHeight &&
      size > 7
    ) {
      size--;
      btn.style.fontSize = size + "px";
    }

  });

}

function mobileFontSize(text){

  // only apply on small screens
  if(window.innerWidth > 600) return 14;

  const len = text.length;

  if(len > 120) return 7;
  if(len > 90)  return 8;
  if(len > 70)  return 9;
  if(len > 50)  return 10;
  if(len > 35)  return 11;

  return 12;
}

function showTooltip(text, x, y){

  const tip = document.getElementById("tile-tooltip");

  tip.textContent = text;

  tip.style.left = (x + 12) + "px";
  tip.style.top  = (y + 12) + "px";

  tip.classList.add("visible");
}

function moveTooltip(x, y){
  const tip = document.getElementById("tile-tooltip");
  tip.style.left = (x + 12) + "px";
  tip.style.top  = (y + 12) + "px";
}

function hideTooltip(){
  const tip = document.getElementById("tile-tooltip");
  tip.classList.remove("visible");
}

function mergeColor(n){

  // n ranges from 2 → 24
  const t = (n - 2) / (M - 3);

  const lightness = 65 - t * 30;   // light red → dark red
  const saturation = 70 + t * 30;  // slightly stronger saturation

  return `hsl(0, ${saturation}%, ${lightness}%)`;
}

function goHome() {
  window.location.href = "/";
}

function sortMerged(){
	deselect();

  // Flatten the board
  let flat = gameState.flat();

  // Sort so merged tiles come first, then by merge size
  flat.sort((a,b)=>{

    const aMerged = a.words.length > 1;
    const bMerged = b.words.length > 1;

    // merged tiles above singles
    if(aMerged !== bMerged) return bMerged - aMerged;

    // larger merges above smaller merges
    return b.words.length - a.words.length;

  });

  // Rebuild the 2D board
  gameState = [];
  while(flat.length){
    gameState.push(flat.splice(0, COLS));
  }

  // Redraw and save
  renderBoard();
  saveState();
}

function renderBoard() {

  const boardDiv = document.getElementById("board");

  // save scroll position
  const scrollX = boardDiv.scrollLeft;
  const scrollY = boardDiv.scrollTop;

  boardDiv.innerHTML = ""; 
  const table = document.createElement('table');
  table.id = "the_table";

  gameState.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    row.forEach((data, colIndex) => {
      const td = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = "bigbut";

      const textForSizing = data.words.join(" ");
      btn.style.fontSize = mobileFontSize(textForSizing) + "px";
      
      // Highlight if selected
      if (selectedIdx && selectedIdx.r === rowIndex && selectedIdx.c === colIndex) {
  if (selectionHeld) {
    btn.classList.add("selected-held");
  } else {
    btn.classList.add("selected-tile");
  }
}

      if (data.words.length === 1) {
        // Just one item
        btn.textContent = data.words[0];
      } else if (data.words.length < M) {

        let preview = data.words.slice(0,2).join(" • ");
        const suffix = data.words.length > 2 ? "…" : "";
        const count = data.words.length;

        btn.innerHTML =
          `<b>${preview}${suffix} <span style="color:${mergeColor(count)};font-weight:${count>20?'700':'600'}">[${count}]</span></b>`;

      } else {
        // Category complete
        btn.innerHTML = `<b>${data.category}</b>`;
        btn.disabled = true;
        btn.style.background = stringToLightColor(data.category);
      }

      btn.onclick = (e) => handleButtonClick(rowIndex, colIndex, e);

      // Tooltip for merged tiles and long single tiles
      const textContent = data.words.join(" • ");
      const needsTooltip = data.words.length > 1 || textContent.length > 90;

      if (needsTooltip) {
        btn.addEventListener("mouseenter", e => {
          showTooltip(textContent, e.clientX, e.clientY);
        });

        btn.addEventListener("mousemove", e => {
          moveTooltip(e.clientX, e.clientY);
        });

        btn.addEventListener("mouseleave", hideTooltip);

        btn.addEventListener("touchstart", e => {
          showTooltip(textContent, e.touches[0].clientX, e.touches[0].clientY);
        });

        btn.addEventListener("touchend", hideTooltip);
      }

      td.appendChild(btn);
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  boardDiv.appendChild(table);

  // restore scroll position
  boardDiv.scrollLeft = scrollX;
  boardDiv.scrollTop = scrollY;

  if (window.innerWidth > 600) {
  fitButtonText();
}
}


function handleButtonClick(r, c, e) {
  // 1. If it's the first click
  if (selectedIdx === null) {
    selectedIdx = { r, c };
    selectionHeld = !!(e && (e.ctrlKey || e.metaKey));

    const selectedData = gameState[r][c];
    const displayText = selectedData.words.length === 1
      ? selectedData.words[0]
      : selectedData.words.slice(0, 2).join(", ") + "...";

    updateSelectedUI(displayText);
    document.getElementById("deselect").disabled = false;

    // restore visible selection border
    renderBoard();
    return;
  }

  // 2. Prevent clicking the same button twice
  if (selectedIdx.r === r && selectedIdx.c === c) {
    deselect();
    return;
  }

  const firstData = gameState[selectedIdx.r][selectedIdx.c];
  const secondData = gameState[r][c];

  if (firstData.category === secondData.category) {
    // success
    score++;
    document.getElementById("score").textContent = score;

    const sourceR = selectedIdx.r;
    const sourceC = selectedIdx.c;
    const targetR = r;
    let targetC = c;

    gameState[targetR][targetC].words = secondData.words.concat(firstData.words);
    gameState[sourceR].splice(sourceC, 1);

    if (sourceR === targetR && sourceC < targetC) {
      targetC--;
    }

    const mergedSize = gameState[targetR][targetC].words.length;
if (!selectionHeld || mergedSize === M) {
  deselect();
} else {
  selectedIdx = { r: targetR, c: targetC };
  const mergedData = gameState[targetR][targetC];
  const displayText = mergedData.words.length === 1
    ? mergedData.words[0]
    : mergedData.words.slice(0, 2).join(", ") + "...";
  updateSelectedUI(displayText);
  document.getElementById("deselect").disabled = false;
  renderBoard();
}

    saveState();

    const table = document.getElementById("the_table");
    if (table && table.rows[targetR] && table.rows[targetR].cells[targetC]) {
      const targetBtn = table.rows[targetR].cells[targetC].querySelector("button");
      if (targetBtn) {
        targetBtn.classList.add("success-glow");
        setTimeout(() => targetBtn.classList.remove("success-glow"), 600);
      }
    }

    if (score === M * (M - 1)) {
      triggerWinState();
    }

  } else {
    // mistake logic
    const table = document.getElementById("the_table");
    const firstRow = table.rows[selectedIdx.r];
    const secondRow = table.rows[r];

    const firstBtn = firstRow.cells[selectedIdx.c].querySelector("button");
    const secondBtn = secondRow.cells[c].querySelector("button");

    if (firstBtn) firstBtn.classList.add("shake");
    if (secondBtn) secondBtn.classList.add("shake");

    const pairKey = [firstData.words[0], secondData.words[0]].sort().join("|");
    if (!attemptedMistakes.has(pairKey)) {
      mistakes++;
      document.getElementById("mistakes").textContent = mistakes;
      attemptedMistakes.add(pairKey);
      saveState();
    } else {
      console.log("Repeat mistake detected. Counter not incremented.");
    }

    const originalSelection = { ...selectedIdx };

    setTimeout(() => {
      if (firstBtn) firstBtn.classList.remove("shake");
      if (secondBtn) secondBtn.classList.remove("shake");

      if (!selectionHeld) {
        deselect();
      } else {
        selectedIdx = originalSelection;

        renderBoard();

        const displayText = firstData.words.length === 1
          ? firstData.words[0]
          : firstData.words.slice(0, 2).join(", ") + "...";

        updateSelectedUI(displayText);
        document.getElementById("deselect").disabled = false;
      }
    }, 300);

    saveState();
  }
}

function confirmReset() {
  if (confirm("Are you sure you want to reset the entire board? All progress will be lost!")) {
    // 1. Clear storage
    localStorage.removeItem('gameState');
    localStorage.removeItem('score');
    localStorage.removeItem('mistakes');
    localStorage.removeItem('attemptedMistakes');

    // 2. Reset local variables
    score = 0;
    mistakes = 0;
    attemptedMistakes = new Set();
    selectedIdx = null;

    // 3. Update UI
    document.getElementById("score").textContent = "0";
    document.getElementById("mistakes").textContent = "0";
    updateSelectedUI("");

    // 4. Re-initialize the 2D game state
    loadState(); 
  }
}

function shuffleArray(array) {

  for (let i = array.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;

  }

}

function loadState() {
  const id = new URLSearchParams(window.location.search).get("id");
  const key = (k) => `puzzle_${id}_${k}`;

  const savedScore = localStorage.getItem(key('score'));
  let rawData = localStorage.getItem(key('gameState'));
  let flatList = [];

  if (savedScore === null || !rawData) {
    // FRESH START
    for (const [catName, words] of Object.entries(cats)) {
      for (let i = 0; i < M; i++) {
        flatList.push({ words: [words[i]], category: catName });
      }
    }
    shuffleArray(flatList);
  } else {
    // LOAD SAVED
    let loadedData = JSON.parse(rawData);
    if (Array.isArray(loadedData[0])) {
      flatList = loadedData.flat();
    } else {
      flatList = loadedData;
    }
    score = Number(savedScore);
    mistakes = Number(localStorage.getItem(key('mistakes')) || 0);
    attemptedMistakes = new Set(JSON.parse(localStorage.getItem(key('attemptedMistakes')) || "[]"));
    document.getElementById("score").textContent = score;
    document.getElementById("mistakes").textContent = mistakes;
  }

  // 2. BUILD GAME STATE (Chunking by COLS)
  gameState = [];
  // Ensure we don't modify the source list during splicing if it was a reference
  // (flatList is safe here because it was created fresh or flattened)
  while(flatList.length) {
    gameState.push(flatList.splice(0, COLS));
  }

    localStorage.setItem(key('gameState'), JSON.stringify(gameState));
  renderBoard();
}

function initScrollListener() {
  const board = document.getElementById('board');
  const howto = document.getElementById('howto');
  const resetBtn = document.getElementById('reset-btn');

  if (!board) return;

  board.addEventListener('scroll', () => {
    // Determine if we've scrolled enough to trigger the transition
    const isScrolled = board.scrollTop > 12;

    if (isScrolled) {
      if (howto) howto.classList.add('hiding-active');
      if (resetBtn) resetBtn.classList.add('hiding-active');
    } else {
      if (howto) howto.classList.remove('hiding-active');
      if (resetBtn) resetBtn.classList.remove('hiding-active');
    }
  });
}

function triggerWinState() {
	hideTooltip();

  // Show animated banner
  const banner = document.getElementById("win-banner");
  if (banner) {
    banner.classList.add("win-active");
  }

  // Activate CRT overlay
  const crt = document.getElementById("crt-overlay");
  if (crt) {
    crt.classList.add("active");
  }

  // Start fireworks
  if (typeof startDotDance === "function") {
    startDotDance();
  }

  // Play victory sound
  playVictoryJingle();

}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("return-to-board").onclick = returnToBoard;
  initScrollListener();
  loadPuzzle();
});

/* Simple Self-Contained Fireworks Logic */
const startFireworks = () => {
    const canvas = document.getElementById('fireworks');
    const ctx = canvas.getContext('2d');
    let cw = window.innerWidth;
    let ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;

    let fireworks = [];
    let particles = [];
    let hue = 120;

    function random(min, max) { return Math.random() * (max - min) + min; }

    function calculateDistance(p1x, p1y, p2x, p2y) {
        return Math.sqrt(Math.pow(p1x - p2x, 2) + Math.pow(p1y - p2y, 2));
    }

    function Firework(sx, sy, tx, ty) {
        this.x = sx; this.y = sy;
        this.sx = sx; this.sy = sy;
        this.tx = tx; this.ty = ty;
        this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
        this.distanceTraveled = 0;
        this.coordinates = [];
        this.coordinateCount = 3;
        while(this.coordinateCount--) { this.coordinates.push([this.x, this.y]); }
        this.angle = Math.atan2(ty - sy, tx - sx);
        this.speed = 2;
        this.acceleration = 1.05;
        this.brightness = random(50, 70);
    }

    Firework.prototype.update = function(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.acceleration;
        let vx = Math.cos(this.angle) * this.speed;
        let vy = Math.sin(this.angle) * this.speed;
        this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

        if(this.distanceTraveled >= this.distanceToTarget) {
            createParticles(this.tx, this.ty);
            fireworks.splice(index, 1);
        } else {
            this.x += vx;
            this.y += vy;
        }
    }

    Firework.prototype.draw = function() {
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
        ctx.stroke();
    }

    function Particle(x, y) {
        this.x = x; this.y = y;
        this.coordinates = [];
        this.coordinateCount = 5;
        while(this.coordinateCount--) { this.coordinates.push([this.x, this.y]); }
        this.angle = random(0, Math.PI * 2);
        this.speed = random(1, 10);
        this.friction = 0.95;
        this.gravity = 1;
        this.hue = random(hue - 20, hue + 20);
        this.brightness = random(50, 80);
        this.alpha = 1;
        this.decay = random(0.015, 0.03);
    }

    Particle.prototype.update = function(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.alpha -= this.decay;
        if(this.alpha <= this.decay) { particles.splice(index, 1); }
    }

    Particle.prototype.draw = function() {
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        ctx.stroke();
    }

    function createParticles(x, y) {
        let count = 30;
        while(count--) { particles.push(new Particle(x, y)); }
    }

    function loop() {
        requestAnimationFrame(loop);
        hue += 0.5;
        ctx.clearRect(0, 0, cw, ch);
	ctx.globalCompositeOperation = 'lighter';

        let i = fireworks.length;
        while(i--) { fireworks[i].draw(); fireworks[i].update(i); }
        let j = particles.length;
        while(j--) { particles[j].draw(); particles[j].update(j); }

        // Launch a firework randomly once per 20 frames
        if(Math.random() < 0.05) {
            fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
        }
    }

    loop();
};

function playVictoryJingle(){

  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  function note(freq, start, duration){
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    osc.type = "square";

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.start(start);
    osc.stop(start + duration);
  }

  const now = ctx.currentTime;

  // simple retro fanfare
  note(523.25, now, 0.2);     // C
  note(659.25, now+0.2, 0.2); // E
  note(783.99, now+0.4, 0.2); // G
  note(1046.5, now+0.6, 0.4); // high C

}


function returnToBoard(){
  const canvas = document.getElementById("dotdance");
  const board  = document.getElementById("board");
  const button = document.getElementById("return-to-board");
  const fade   = document.getElementById("win-fade");

  canvas.style.display = "none";
  fade.style.opacity = "0";
  board.style.visibility = "visible";
  button.style.opacity = "0";
  button.style.display = "none";
}

function startDotDance(){
  document.getElementById("return-to-board").style.display = "block";
  setTimeout(() => {
    document.getElementById("return-to-board").style.opacity = "1";
  }, 50);

  const canvas = document.getElementById("dotdance");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const N = Object.keys(cats).length;
  const lissRadius = Math.min(canvas.width, canvas.height) * 0.35;
  const dots = [];

  let tiles = document.querySelectorAll(".bigbut:disabled");
  if(tiles.length === 0) tiles = document.querySelectorAll(".bigbut");

  // Capture tile colours and positions BEFORE hiding board
  tiles.forEach(tile => {
    const rect = tile.getBoundingClientRect();
    let color = getComputedStyle(tile).backgroundColor;
    if(!color || color === "rgba(0, 0, 0, 0)" || color === "transparent") color = "#888";

    // Brighten colour for dark background
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = 1;
    const tctx = tmp.getContext("2d");
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = tctx.getImageData(0, 0, 1, 1).data;
    const brighten = (v) => Math.min(255, Math.round(v * 1.4 + 30));
    const brightColor = `rgb(${brighten(r)}, ${brighten(g)}, ${brighten(b)})`;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for(let j = 0; j < N; j++){
      dots.push({
        x: cx + (Math.random() - 0.5) * rect.width,
        y: cy + (Math.random() - 0.5) * rect.height,
        originX: cx,
        originY: cy,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        color: brightColor
      });
    }
  });

  // Fade background
  const fade = document.getElementById("win-fade");
  fade.style.opacity = "0.92";

  document.getElementById("board").style.visibility = "hidden";

  let stage = 0;
  let time = 0;
  const STAGE_DURATION = 3000;   // ms per stage
  const EASE = 0.04;             // slower easing for smoother transitions

  function advanceStage(){
    stage = (stage + 1) % 5;

    if(stage === 0){
      // Reset to origin for scatter
      dots.forEach(d => {
        d.x = d.originX + (Math.random() - 0.5) * 20;
        d.y = d.originY + (Math.random() - 0.5) * 20;
        d.vx = (Math.random() - 0.5) * 3;
        d.vy = (Math.random() - 0.5) * 3;
      });
    }

    setTimeout(advanceStage, STAGE_DURATION);
  }
  setTimeout(advanceStage, STAGE_DURATION);

  function animate(){
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time += 0.01; // slower time = slower animation = epilepsy safer

    // Gentle pulse: dot radius breathes between 3 and 5
    const pulse = 4 + Math.sin(time * 1.5) * 1.5;

    dots.forEach((d, i) => {

      if(stage === 0){
        // Scatter with soft bounce
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.995; // gentle friction so dots don't fly forever
        d.vy *= 0.995;
        if(d.x < 0 || d.x > canvas.width)  d.vx *= -1;
        if(d.y < 0 || d.y > canvas.height) d.vy *= -1;
      }

      else if(stage === 1){
        // Grid — N columns × N rows
        const col = i % N;
        const row = Math.floor(i / N);
        const spacing = Math.min(canvas.width, canvas.height) / (N + 2);
        const targetX = centerX + (col - (N - 1) / 2) * spacing;
        const targetY = centerY + (row - (Math.floor(dots.length / N) - 1) / 2) * spacing;
        d.x += (targetX - d.x) * EASE;
        d.y += (targetY - d.y) * EASE;
      }

      else if(stage === 2){
        // Spiral ring — evenly spaced, slow rotation
        const angle = (i / dots.length) * Math.PI * 2 + time * 0.3;
        const radius = Math.min(canvas.width, canvas.height) * 0.3;
        const targetX = centerX + Math.cos(angle) * radius;
        const targetY = centerY + Math.sin(angle) * radius;
        d.x += (targetX - d.x) * EASE;
        d.y += (targetY - d.y) * EASE;
      }

      else if(stage === 3){
        // Lissajous N : N+1
        const t = (i / dots.length) * Math.PI * 2 + time * 0.2;
        const targetX = centerX + lissRadius * Math.sin(N * t + time * 0.15);
        const targetY = centerY + lissRadius * Math.sin((N + 1) * t);
        d.x += (targetX - d.x) * EASE;
        d.y += (targetY - d.y) * EASE;
      }

      else if(stage === 4){
        // Lissajous N : N+2
        const t = (i / dots.length) * Math.PI * 2 + time * 0.2;
        const targetX = centerX + lissRadius * Math.sin(N * t + time * 0.15);
        const targetY = centerY + lissRadius * Math.sin((N + 2) * t);
        d.x += (targetX - d.x) * EASE;
        d.y += (targetY - d.y) * EASE;
      }

      ctx.beginPath();
      ctx.arc(d.x, d.y, pulse, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();
    });
  }

  animate();
}