const fileInput = document.getElementById("fileInput");
const tiledCheck = document.getElementById("tiledCheck");
const detectBtn = document.getElementById("detectBtn");
const preview = document.getElementById("preview");
const overlay = document.getElementById("overlay");
const previewSection = document.getElementById("previewSection");
const resultSection = document.getElementById("resultSection");
const loadingSection = document.getElementById("loadingSection");
const errorSection = document.getElementById("errorSection");
const errorMsg = document.getElementById("errorMsg");
const totalCount = document.getElementById("totalCount");
const countsList = document.getElementById("countsList");
const confSlider = document.getElementById("confSlider");
const confValue = document.getElementById("confValue");

let detections = []; // all boxes returned by the backend

// Show image preview when a file is selected
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  previewSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  detections = [];
  clearOverlay();
});

// Keep the boxes aligned if the image size changes
preview.addEventListener("load", render);
window.addEventListener("resize", render);

// Re-filter instantly when the slider moves (no new request needed)
confSlider.addEventListener("input", render);

// Send image to backend on button click
detectBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    showError("Please select an image first.");
    return;
  }

  loadingSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  detectBtn.disabled = true;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`/api/detect?tiled=${tiledCheck.checked}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Server error: " + response.status);

    const data = await response.json();
    detections = data.detections;
    resultSection.classList.remove("hidden");
    render();
  } catch (err) {
    showError(err.message);
  } finally {
    loadingSection.classList.add("hidden");
    detectBtn.disabled = false;
  }
});

function visibleDetections() {
  const threshold = Number(confSlider.value) / 100;
  return detections.filter((d) => d.conf >= threshold);
}

function render() {
  confValue.textContent = confSlider.value + "%";
  const shown = visibleDetections();
  drawBoxes(shown);
  showCounts(shown);
}

function colorFor(label) {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${hash}, 85%, 45%)`;
}

function clearOverlay() {
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

function drawBoxes(list) {
  const w = preview.clientWidth;
  const h = preview.clientHeight;
  if (!w || !h) return;
  overlay.width = w;
  overlay.height = h;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 2;
  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "top";

  for (const d of list) {
    const x = d.x1 * w, y = d.y1 * h;
    const bw = (d.x2 - d.x1) * w, bh = (d.y2 - d.y1) * h;
    const color = colorFor(d.label);
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, bw, bh);

    const text = `${d.label} ${Math.round(d.conf * 100)}%`;
    const tw = ctx.measureText(text).width + 6;
    const ty = y >= 16 ? y - 16 : y; // keep the label inside the image
    ctx.fillStyle = color;
    ctx.fillRect(x, ty, tw, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x + 3, ty + 2);
  }
}

function showCounts(list) {
  totalCount.textContent = list.length;
  countsList.innerHTML = "";

  if (list.length === 0) {
    countsList.innerHTML = "<li>No waste detected. Try lowering the threshold.</li>";
    return;
  }

  const counts = {};
  for (const d of list) counts[d.label] = (counts[d.label] || 0) + 1;

  for (const [className, count] of Object.entries(counts)) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = className; // textContent, not innerHTML: labels come from the server
    const num = document.createElement("span");
    num.textContent = count;
    li.append(name, num);
    countsList.appendChild(li);
  }
}

function showError(message) {
  errorMsg.textContent = message;
  errorSection.classList.remove("hidden");
}