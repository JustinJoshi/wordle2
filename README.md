# wordle2

A standalone Wordle helper app that filters possible 5-letter answers in real time.

## Features

- 5 interactive Wordle-style tiles with letter + state (`none`, `gray`, `yellow`, `green`)
- Click a tile to cycle states: `none -> gray -> yellow -> green -> none`
- Live filtering on every keystroke and state change
- Match count + scrollable result list
- One-click clear/reset button

## Run locally

`words.txt` is loaded with `fetch`, so run from a local static server (not `file://`).

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## How to use

1. Type letters into the 5 tiles.
2. Click each tile to set its meaning:
   - gray: letter is not in the word (or no extra copies when duplicates exist)
   - yellow: letter is in the word but not in this position
   - green: letter is in the correct position
3. Read the live-updating result list and word count.
4. Click **Clear** to reset all constraints.