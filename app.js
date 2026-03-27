const TILE_COUNT = 5;
const STATE_ORDER = ["none", "gray", "yellow", "green"];

const tilesRoot = document.getElementById("tiles");
const wordListEl = document.getElementById("wordList");
const countEl = document.getElementById("count");
const emptyStateEl = document.getElementById("emptyState");
const clearBtn = document.getElementById("clearBtn");
const excludedInputEl = document.getElementById("excludedInput");
const excludedChipsEl = document.getElementById("excludedChips");

const cells = Array.from({ length: TILE_COUNT }, () => ({ letter: "", state: "none" }));
const tileEls = [];
const excludedLetters = new Set();
let words = [];

function nextState(current) {
  const idx = STATE_ORDER.indexOf(current);
  return STATE_ORDER[(idx + 1) % STATE_ORDER.length];
}

function setLetter(index, rawLetter) {
  const letter = (rawLetter || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 1);
  cells[index].letter = letter;
  if (!letter) {
    cells[index].state = "none";
  }
}

function focusTile(index) {
  if (index < 0 || index >= TILE_COUNT) return;
  const input = tileEls[index].querySelector("input");
  input.focus();
  input.select();
}

function buildTiles() {
  for (let i = 0; i < TILE_COUNT; i += 1) {
    const tile = document.createElement("div");
    tile.className = "tile none";
    tile.dataset.index = String(i);

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 1;
    input.placeholder = "_";
    input.setAttribute("aria-label", `Letter ${i + 1}`);
    input.autocomplete = "off";
    input.autocorrect = "off";
    input.spellcheck = false;

    tile.appendChild(input);
    tilesRoot.appendChild(tile);
    tileEls.push(tile);

    tile.addEventListener("click", () => {
      if (!cells[i].letter) return;
      cells[i].state = nextState(cells[i].state);
      renderTiles();
      filterAndRender();
    });

    input.addEventListener("keydown", (event) => {
      const { key } = event;

      if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        setLetter(i, key);
        if (cells[i].state === "none") {
          cells[i].state = "gray";
        }
        renderTiles();
        filterAndRender();
        focusTile(i + 1);
        return;
      }

      if (key === "Backspace") {
        event.preventDefault();
        if (cells[i].letter) {
          setLetter(i, "");
          renderTiles();
          filterAndRender();
          return;
        }

        const prev = i - 1;
        if (prev >= 0) {
          setLetter(prev, "");
          renderTiles();
          filterAndRender();
          focusTile(prev);
        }
        return;
      }

      if (key === "Delete") {
        event.preventDefault();
        setLetter(i, "");
        renderTiles();
        filterAndRender();
        return;
      }

      if (key === "ArrowLeft") {
        event.preventDefault();
        focusTile(i - 1);
        return;
      }

      if (key === "ArrowRight") {
        event.preventDefault();
        focusTile(i + 1);
      }
    });

    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = event.clipboardData.getData("text").toLowerCase().replace(/[^a-z]/g, "");
      if (!pasted) return;

      const chars = pasted.slice(0, TILE_COUNT - i).split("");
      chars.forEach((ch, offset) => {
        const target = i + offset;
        setLetter(target, ch);
        if (cells[target].state === "none") {
          cells[target].state = "gray";
        }
      });
      renderTiles();
      filterAndRender();
      focusTile(Math.min(i + chars.length, TILE_COUNT - 1));
    });

    input.addEventListener("input", () => {
      const value = input.value.toLowerCase().replace(/[^a-z]/g, "").slice(-1);
      setLetter(i, value);
      if (value && cells[i].state === "none") {
        cells[i].state = "gray";
      }
      renderTiles();
      filterAndRender();
      if (value) {
        focusTile(i + 1);
      }
    });
  }
}

function renderTiles() {
  for (let i = 0; i < TILE_COUNT; i += 1) {
    const tile = tileEls[i];
    const input = tile.querySelector("input");
    const { letter, state } = cells[i];
    tile.className = `tile ${state}`;
    input.value = letter.toUpperCase();
  }
}

function renderExcluded() {
  excludedChipsEl.textContent = "";
  const frag = document.createDocumentFragment();
  [...excludedLetters]
    .sort()
    .forEach((letter) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "excluded-chip";
      chip.textContent = `${letter} ×`;
      chip.setAttribute("aria-label", `Remove excluded letter ${letter.toUpperCase()}`);
      chip.addEventListener("click", () => {
        excludedLetters.delete(letter);
        renderExcluded();
        filterAndRender();
      });
      frag.appendChild(chip);
    });
  excludedChipsEl.appendChild(frag);
}

function addExcludedLetters(value) {
  const letters = (value || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!letters) return;

  for (const letter of letters) {
    excludedLetters.add(letter);
  }
  renderExcluded();
  filterAndRender();
}

function buildConstraints() {
  const greens = Array(TILE_COUNT).fill(null);
  const yellowByPos = Array.from({ length: TILE_COUNT }, () => new Set());
  const grayByPos = Array.from({ length: TILE_COUNT }, () => new Set());
  const minCounts = new Map();
  const grayCounts = new Map();

  cells.forEach((cell, index) => {
    if (!cell.letter || cell.state === "none") return;

    if (cell.state === "green") {
      greens[index] = cell.letter;
      minCounts.set(cell.letter, (minCounts.get(cell.letter) || 0) + 1);
      return;
    }

    if (cell.state === "yellow") {
      yellowByPos[index].add(cell.letter);
      minCounts.set(cell.letter, (minCounts.get(cell.letter) || 0) + 1);
      return;
    }

    grayByPos[index].add(cell.letter);
    grayCounts.set(cell.letter, (grayCounts.get(cell.letter) || 0) + 1);
  });

  for (const letter of excludedLetters) {
    if (!minCounts.has(letter)) {
      grayCounts.set(letter, Math.max(grayCounts.get(letter) || 0, 1));
    }
  }

  return { greens, yellowByPos, grayByPos, minCounts, grayCounts };
}

function countLetters(word) {
  const counts = new Map();
  for (const ch of word) {
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  return counts;
}

function matchesWord(word, constraints) {
  const { greens, yellowByPos, grayByPos, minCounts, grayCounts } = constraints;
  const letterCounts = countLetters(word);

  for (let i = 0; i < TILE_COUNT; i += 1) {
    if (greens[i] && word[i] !== greens[i]) return false;
    if (yellowByPos[i].size > 0) {
      for (const letter of yellowByPos[i]) {
        if (word[i] === letter) return false;
      }
    }
    if (grayByPos[i].size > 0) {
      for (const letter of grayByPos[i]) {
        if (word[i] === letter) return false;
      }
    }
  }

  for (const [letter, min] of minCounts.entries()) {
    if ((letterCounts.get(letter) || 0) < min) return false;
  }

  // Gray letters are either absent, or capped if the letter also appears as yellow/green.
  for (const [letter] of grayCounts.entries()) {
    const min = minCounts.get(letter) || 0;
    const actual = letterCounts.get(letter) || 0;
    if (min === 0 && actual > 0) return false;
    if (min > 0 && actual !== min) return false;
  }

  return true;
}

function filterWords() {
  const constraints = buildConstraints();
  return words.filter((word) => matchesWord(word, constraints)).sort();
}

function renderResults(filteredWords) {
  countEl.textContent = `${filteredWords.length} possible words`;
  wordListEl.textContent = "";

  if (filteredWords.length === 0) {
    emptyStateEl.hidden = false;
    return;
  }

  emptyStateEl.hidden = true;
  const frag = document.createDocumentFragment();
  filteredWords.forEach((word) => {
    const li = document.createElement("li");
    li.textContent = word;
    frag.appendChild(li);
  });
  wordListEl.appendChild(frag);
}

function filterAndRender() {
  renderResults(filterWords());
}

function resetAll() {
  for (let i = 0; i < TILE_COUNT; i += 1) {
    cells[i] = { letter: "", state: "none" };
  }
  excludedLetters.clear();
  excludedInputEl.value = "";
  renderExcluded();
  renderTiles();
  filterAndRender();
  focusTile(0);
}

async function loadWords() {
  const text = await fetch("./words.txt").then((r) => {
    if (!r.ok) throw new Error("Failed to load words.txt");
    return r.text();
  });

  words = text
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]{5}$/.test(w));
}

async function init() {
  buildTiles();
  clearBtn.addEventListener("click", resetAll);
  excludedInputEl.addEventListener("input", () => {
    addExcludedLetters(excludedInputEl.value);
    excludedInputEl.value = "";
  });
  excludedInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !excludedInputEl.value && excludedLetters.size > 0) {
      const last = [...excludedLetters].pop();
      excludedLetters.delete(last);
      renderExcluded();
      filterAndRender();
    }
  });

  try {
    await loadWords();
    renderExcluded();
    renderTiles();
    filterAndRender();
    focusTile(0);
  } catch (error) {
    countEl.textContent = "Could not load word list.";
    emptyStateEl.hidden = false;
    emptyStateEl.textContent = "Start a local static server and reload the page.";
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

init();
