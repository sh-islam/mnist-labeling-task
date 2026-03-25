# MNIST Labeling Task

## Developer Guide

### Overview

A static web app for human labeling of MNIST digit images. Images are sampled from uncertain classifier predictions (produced by `create_mnist_sample/`). The app runs entirely client-side — no backend needed, just a static file server.

### Project Structure

```
labeling-task/
  index.html        # main page
  style.css         # styles
  app.js            # all client-side logic
  prepare.py        # converts .npy sample + images into web-ready format
  samples.json      # generated — list of {index, class_dir} for the app
  images/            # generated — PNGs copied from create_mnist_sample output
    class_0/
    class_1/
    ...
```

### Pipeline

The full pipeline from training to labeling:

```bash
# 1. Train classifiers and save per-image confidence data
cd create_mnist_sample/
python train_and_score.py --save

# 2. Sample N images from the uncertain pool
python sample.py --n 2000 --model logreg --sampling stratified --conf 0.7

# 3. Prepare the web app (copy images + build samples.json)
cd ../labeling-task/
python prepare.py --sample ../create_mnist_sample/sample_logreg_stratified_n2000.npy \
                  --images-dir ../create_mnist_sample/output_stratified

# 4. Push to GitHub and enable GitHub Pages
```

### prepare.py arguments

| Arg | Default | Description |
|-----|---------|-------------|
| `--sample` | `../create_mnist_sample/sample_logreg_random_n2000.npy` | Path to sample `.npy` file |
| `--images-dir` | `../create_mnist_sample/output_random` | Path to directory with class_*/index.png images |

`prepare.py` copies only the sampled images (e.g. 2,000 out of 60,000) from `--images-dir` into `labeling-task/images/class_*/` and builds `samples.json`. You never need to manually copy images — `prepare.py` handles it all.

### Switching sample sets

To switch from random to stratified (or a different model/threshold):

```bash
python prepare.py --sample ../create_mnist_sample/sample_logreg_stratified_n2000.npy \
                  --images-dir ../create_mnist_sample/output_stratified
```

Then refresh the browser. `prepare.py` overwrites `samples.json` and `images/` each time.

### Session CSV format

The app saves/loads CSVs with two columns:

```
index,user_label
40598,2
12345,7
...
```

- `index` is the MNIST training set image index (0-59999)
- `user_label` is the digit (0-9) the human assigned
- No true labels or model predictions are included — analysis is done separately

---

## User Guide

### Getting started

1. Open the app URL in your browser (provided by whoever set up the server)
2. Click **Start** to begin labeling

### Controls

| Key | Action |
|-----|--------|
| `0`-`9` | Type a digit label for the current image |
| `Enter` | Confirm your label and go to the next image |
| `Backspace` | Clear your current label (before confirming) |

- You **must** type a digit before pressing Enter — it won't advance without a label
- Images are shown in random order

### Zooming

The image displays at its native 28x28 pixel size. To zoom in:

| Control | Action |
|---------|--------|
| `+` / `-` buttons | Zoom in / out |
| **Reset** button | Return to native size |
| Mouse wheel (over image) | Zoom in / out |

Zoom level persists between images — if you find a comfortable zoom, it stays.

### Saving your progress

Click **Save Session** at any time. This downloads a `labeling_session.csv` file to your computer. This file contains only the images you have labeled so far.

### Resuming a session

1. Click **Load Session**
2. Select your previously downloaded `labeling_session.csv`
3. The app loads your progress and resumes with the remaining unlabeled images

### Remapping keys

If Enter or Backspace are inconvenient:

1. Scroll down to the **Instructions** section
2. Click **Remap confirm key** or **Remap clear key**
3. Press the key you want to use instead

Key remaps reset when you refresh the page.

### Tips

- Save frequently — there is no auto-save
- You can close the browser and resume later by loading your CSV
- If unsure about a digit, give your best guess — the goal is your honest interpretation
- Zoom in if the digit is hard to read at native size
