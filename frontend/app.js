const fileInput = document.getElementById("fileInput");
const detectBtn = document.getElementById("detectBtn");
const gpsBtn = document.getElementById("gpsBtn");
const latInput = document.getElementById("latInput");
const lngInput = document.getElementById("lngInput");
const locationStatus = document.getElementById("locationStatus");

const preview = document.getElementById("preview");
const previewSection = document.getElementById("previewSection");
const resultSection = document.getElementById("resultSection");
const loadingSection = document.getElementById("loadingSection");
const errorSection = document.getElementById("errorSection");
const errorMsg = document.getElementById("errorMsg");
const totalCount = document.getElementById("totalCount");
const severityLabel = document.getElementById("severityLabel");
const countsList = document.getElementById("countsList");

// ---------- Location handling ----------
function updateLocationStatus() {
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  if (!isNaN(lat) && !isNaN(lng)) {
    locationStatus.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    locationStatus.classList.add("set");
  } else {
    locationStatus.textContent = "No location set";
    locationStatus.classList.remove("set");
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
      locationStatus.classList.remove("set");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ---------- Image preview ----------
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  previewSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  errorSection.classList.add("hidden");
});

// ---------- Detect & Report ----------
detectBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
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
  formData.append("file", file);
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

function showResults(data) {
  totalCount.textContent = data.total;

  severityLabel.textContent = data.severity;
  severityLabel.className = "sev-" + data.severity;

  countsList.innerHTML = "";
  if (data.total === 0) {
    countsList.innerHTML = "<li>No waste detected in this image.</li>";
  } else {
    for (const [className, count] of Object.entries(data.counts)) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${className}</span><span>${count}</span>`;
      countsList.appendChild(li);
    }
  }

  resultSection.classList.remove("hidden");
}

function showError(message) {
  errorMsg.textContent = message;
  errorSection.classList.remove("hidden");
}