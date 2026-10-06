// ============================================
// WasteHotspot AI — Upload Page Logic
// ============================================

const fileInput = document.getElementById("fileInput");
const detectBtn = document.getElementById("detectBtn");
const gpsBtn = document.getElementById("gpsBtn");
const latInput = document.getElementById("latInput");
const lngInput = document.getElementById("lngInput");
const locationStatus = document.getElementById("locationStatus");
const dropZone = document.getElementById("dropZone");

const preview = document.getElementById("preview");
const previewSection = document.getElementById("previewSection");
const resultSection = document.getElementById("resultSection");
const loadingSection = document.getElementById("loadingSection");
const errorSection = document.getElementById("errorSection");
const errorMsg = document.getElementById("errorMsg");
const totalCount = document.getElementById("totalCount");
const severityLabel = document.getElementById("severityLabel");
const countsList = document.getElementById("countsList");

let selectedFile = null;

// ---------- Location ----------
function updateLocationStatus() {
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  if (!isNaN(lat) && !isNaN(lng)) {
    locationStatus.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    locationStatus.style.color = "var(--primary-dark)";
    locationStatus.style.fontWeight = "600";
  } else {
    locationStatus.textContent = "No location set";
    locationStatus.style.color = "var(--gray-600)";
    locationStatus.style.fontWeight = "normal";
  }
}

latInput.addEventListener("input", updateLocationStatus);
lngInput.addEventListener("input", updateLocationStatus);

gpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }
  locationStatus.textContent = "Getting location...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      latInput.value = pos.coords.latitude.toFixed(6);
      lngInput.value = pos.coords.longitude.toFixed(6);
      updateLocationStatus();
    },
    (err) => {
      locationStatus.textContent = "GPS failed: " + err.message;
      locationStatus.style.color = "var(--danger)";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ---------- Drag & Drop ----------
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    handleFile(file);
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  selectedFile = file;
  preview.src = URL.createObjectURL(file);
  previewSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  previewSection.classList.add("animate-in");
  dropZone.querySelector(".drop-zone-text").innerHTML =
    `<strong>✓ ${file.name}</strong> (${(file.size / 1024).toFixed(0)} KB)`;
}

// ---------- Detect ----------
detectBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    showError("Please select an image first.");
    return;
  }

  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  if (isNaN(lat) || isNaN(lng)) {
    showError("Please set a location first (GPS or manual).");
    return;
  }

  loadingSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  detectBtn.disabled = true;

  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("lat", lat);
  formData.append("lng", lng);

  try {
    const response = await fetch("/api/detect", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error("Server error: " + response.status + " — " + errText);
    }

    const data = await response.json();
    showResults(data);
  } catch (err) {
    showError(err.message);
  } finally {
    loadingSection.classList.add("hidden");
    detectBtn.disabled = false;
  }
});

// ---------- Show Results ----------
function showResults(data) {
  // Animated count-up
  animateNumber(totalCount, data.total, 800);

  // Severity badge
  severityLabel.textContent = data.severity.toUpperCase();
  severityLabel.className = "badge badge-" + data.severity;

  // Counts list
  countsList.innerHTML = "";
  if (data.total === 0) {
    countsList.innerHTML = '<li class="class-item"><span>No waste detected</span></li>';
  } else {
    const sorted = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([className, count]) => {
      const li = document.createElement("li");
      li.className = "class-item";
      li.innerHTML = `<span class="class-name">${className}</span><span class="class-count">${count}</span>`;
      countsList.appendChild(li);
    });
  }

  resultSection.classList.remove("hidden");
  resultSection.classList.add("animate-in");
}

function showError(message) {
  errorMsg.textContent = message;
  errorSection.classList.remove("hidden");
}

// ---------- Helpers ----------
function animateNumber(el, target, duration) {
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}