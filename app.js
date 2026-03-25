(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────────
  let samples = [];
  let order = [];
  let labels = {};
  let currentPos = 0;
  let currentLabel = null;
  let zoom = 1;
  const ZOOM_STEP = 1;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 20;
  const IMG_SIZE = 28;

  // ── Key bindings (remappable) ─────────────────────────────────────────
  let confirmKey = "Enter";
  let clearKey = "Backspace";
  let remapTarget = null; // "confirm" or "clear" when listening for new key

  // ── DOM refs ───────────────────────────────────────────────────────────
  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const startScreen = document.getElementById("start-screen");
  const labelScreen = document.getElementById("label-screen");
  const doneScreen = document.getElementById("done-screen");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const imageContainer = document.getElementById("image-container");
  const currentLabelEl = document.getElementById("current-label");
  const imgIndexEl = document.getElementById("img-index");
  const imgProgressEl = document.getElementById("img-progress");
  const zoomLevelEl = document.getElementById("zoom-level");
  const doneCountEl = document.getElementById("done-count");
  const btnStart = document.getElementById("btn-start");
  const btnSave = document.getElementById("btn-save");
  const btnLoad = document.getElementById("btn-load");
  const fileInput = document.getElementById("file-input");
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnZoomReset = document.getElementById("btn-zoom-reset");
  const confirmKeyLabel = document.getElementById("confirm-key-label");
  const clearKeyLabel = document.getElementById("clear-key-label");
  const remapConfirmLink = document.getElementById("remap-confirm");
  const remapClearLink = document.getElementById("remap-clear");

  // ── Init ───────────────────────────────────────────────────────────────
  fetch("samples.json")
    .then((r) => r.json())
    .then((data) => {
      samples = data;
      order = shuffleArray([...Array(samples.length).keys()]);
      updateProgress();
    })
    .catch((err) => {
      console.error("Failed to load samples.json:", err);
      startScreen.innerHTML =
        '<p style="color:#e94560">Error: could not load samples.json</p>';
    });

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── Progress ───────────────────────────────────────────────────────────
  function updateProgress() {
    const total = samples.length;
    const done = Object.keys(labels).length;
    const pct = total > 0 ? ((done / total) * 100).toFixed(1) : 0;
    progressText.textContent = `${done} / ${total}  (${pct}%)`;
    progressFill.style.width = `${pct}%`;
  }

  // ── Find next unlabeled ────────────────────────────────────────────────
  function findNextUnlabeled() {
    for (let i = 0; i < order.length; i++) {
      if (!(order[i] in labels)) return i;
    }
    return -1;
  }

  // ── Show image ─────────────────────────────────────────────────────────
  function showImage(sampleIdx) {
    const s = samples[sampleIdx];
    const img = new Image();
    img.onload = function () {
      applyZoom();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE);
    };
    img.src = `images/${s.class_dir}/${s.index}.png`;
    imgIndexEl.textContent = s.index;
    imgProgressEl.textContent = `${Object.keys(labels).length + 1} of ${samples.length}`;
  }

  function applyZoom() {
    const px = IMG_SIZE * zoom;
    canvas.width = IMG_SIZE;
    canvas.height = IMG_SIZE;
    canvas.style.width = px + "px";
    canvas.style.height = px + "px";
    imageContainer.style.width = px + 4 + "px";
    imageContainer.style.height = px + 4 + "px";
    zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
    ctx.imageSmoothingEnabled = false;
  }

  function redrawAtZoom() {
    applyZoom();
    const pos = findNextUnlabeled();
    if (pos >= 0) {
      const s = samples[order[pos]];
      const img = new Image();
      img.onload = function () {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE);
      };
      img.src = `images/${s.class_dir}/${s.index}.png`;
    }
  }

  const btnConfirm = document.getElementById("btn-confirm");
  const btnClear = document.getElementById("btn-clear");
  const numpadDigits = document.querySelectorAll(".numpad-digit");

  // ── Label display ──────────────────────────────────────────────────────
  function setLabelDisplay(val) {
    if (val === null) {
      currentLabelEl.textContent = "\u2014";
      btnConfirm.classList.add("disabled");
      numpadDigits.forEach((b) => b.classList.remove("selected"));
    } else {
      currentLabelEl.textContent = val;
      btnConfirm.classList.remove("disabled");
      numpadDigits.forEach((b) => {
        b.classList.toggle("selected", parseInt(b.dataset.digit) === val);
      });
    }
  }

  // ── Start / Done ──────────────────────────────────────────────────────
  function startLabeling() {
    startScreen.classList.add("hidden");
    doneScreen.classList.add("hidden");

    const pos = findNextUnlabeled();
    if (pos < 0) {
      showDone();
      return;
    }

    currentPos = pos;
    currentLabel = null;
    setLabelDisplay(null);
    labelScreen.classList.remove("hidden");
    showImage(order[currentPos]);
    applyZoom();
  }

  function showDone() {
    labelScreen.classList.add("hidden");
    startScreen.classList.add("hidden");
    doneScreen.classList.remove("hidden");
    doneCountEl.textContent = samples.length;
  }

  // ── Confirm label ──────────────────────────────────────────────────────
  function confirmLabel() {
    if (currentLabel === null) return;

    labels[order[currentPos]] = currentLabel;
    updateProgress();

    currentLabel = null;
    setLabelDisplay(null);

    const nextPos = findNextUnlabeled();
    if (nextPos < 0) {
      showDone();
      return;
    }
    currentPos = nextPos;
    showImage(order[currentPos]);
  }

  // ── Key remapping ─────────────────────────────────────────────────────
  function keyDisplayName(key) {
    const names = {
      " ": "Space", "Enter": "Enter", "Backspace": "Backspace",
      "Tab": "Tab", "Escape": "Escape", "ArrowUp": "Arrow Up",
      "ArrowDown": "Arrow Down", "ArrowLeft": "Arrow Left",
      "ArrowRight": "Arrow Right",
    };
    return names[key] || key;
  }

  function updateKeyLabels() {
    confirmKeyLabel.innerHTML = `<kbd>${keyDisplayName(confirmKey)}</kbd>`;
    clearKeyLabel.innerHTML = `<kbd>${keyDisplayName(clearKey)}</kbd>`;
  }

  function showRemapModal(target) {
    remapTarget = target;
    const label = target === "confirm" ? "confirm" : "clear";
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "remap-modal";
    overlay.innerHTML = `
      <div class="modal">
        <h3>Remap ${label} key</h3>
        <p>Press any key to set as the new <strong>${label}</strong> key.</p>
        <div class="key-display" id="remap-preview">...</div>
        <br>
        <button id="remap-cancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("remap-cancel").addEventListener("click", closeRemapModal);
  }

  function closeRemapModal() {
    remapTarget = null;
    const modal = document.getElementById("remap-modal");
    if (modal) modal.remove();
  }

  remapConfirmLink.addEventListener("click", () => showRemapModal("confirm"));
  remapClearLink.addEventListener("click", () => showRemapModal("clear"));

  // ── Keyboard handler ──────────────────────────────────────────────────
  document.addEventListener("keydown", function (e) {
    // Remap mode — capture the key
    if (remapTarget) {
      e.preventDefault();
      // Don't allow 0-9 as remap targets (they're digit keys)
      if (e.key >= "0" && e.key <= "9") return;

      if (remapTarget === "confirm") {
        confirmKey = e.key;
      } else {
        clearKey = e.key;
      }
      updateKeyLabels();
      closeRemapModal();
      return;
    }

    if (labelScreen.classList.contains("hidden")) return;

    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      currentLabel = parseInt(e.key);
      setLabelDisplay(currentLabel);
    } else if (e.key === confirmKey) {
      e.preventDefault();
      confirmLabel();
    } else if (e.key === clearKey) {
      e.preventDefault();
      currentLabel = null;
      setLabelDisplay(null);
    }
  });

  // ── Zoom controls ─────────────────────────────────────────────────────
  function zoomIn() {
    zoom = Math.min(zoom + ZOOM_STEP, ZOOM_MAX);
    redrawAtZoom();
  }

  function zoomOut() {
    zoom = Math.max(zoom - ZOOM_STEP, ZOOM_MIN);
    redrawAtZoom();
  }

  function zoomReset() {
    zoom = 1;
    redrawAtZoom();
  }

  btnZoomIn.addEventListener("click", zoomIn);
  btnZoomOut.addEventListener("click", zoomOut);
  btnZoomReset.addEventListener("click", zoomReset);

  imageContainer.addEventListener("wheel", function (e) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, { passive: false });

  // ── Numpad clicks ──────────────────────────────────────────────────────
  numpadDigits.forEach((btn) => {
    btn.addEventListener("click", function () {
      currentLabel = parseInt(this.dataset.digit);
      setLabelDisplay(currentLabel);
    });
  });

  btnConfirm.addEventListener("click", function () {
    confirmLabel();
  });

  btnClear.addEventListener("click", function () {
    currentLabel = null;
    setLabelDisplay(null);
  });

  // ── Save session ───────────────────────────────────────────────────────
  btnSave.addEventListener("click", function () {
    if (Object.keys(labels).length === 0) {
      alert("Nothing to save yet.");
      return;
    }
    let csv = "index,user_label\n";
    for (const [sIdx, digit] of Object.entries(labels)) {
      csv += `${samples[parseInt(sIdx)].index},${digit}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "labeling_session.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  // ── Load session ───────────────────────────────────────────────────────
  btnLoad.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      const lines = ev.target.result.trim().split("\n");

      const indexToSample = {};
      for (let i = 0; i < samples.length; i++) {
        indexToSample[samples[i].index] = i;
      }

      let loaded = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts.length < 2) continue;
        const imgIndex = parseInt(parts[0].trim());
        const digit = parseInt(parts[1].trim());
        if (imgIndex in indexToSample && digit >= 0 && digit <= 9) {
          labels[indexToSample[imgIndex]] = digit;
          loaded++;
        }
      }

      updateProgress();
      alert(`Loaded ${loaded} labels. ${samples.length - Object.keys(labels).length} remaining.`);
      startLabeling();
    };
    reader.readAsText(file);
    fileInput.value = "";
  });

  // ── Start button ───────────────────────────────────────────────────────
  btnStart.addEventListener("click", startLabeling);
})();
