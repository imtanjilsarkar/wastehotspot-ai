// Dhaka center
const DHAKA = [23.8103, 90.4125];

// Init map
const map = L.map("map").setView(DHAKA, 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);

// Color by severity
function colorFor(severity) {
  if (severity === "high") return "#c62828";
  if (severity === "medium") return "#f57c00";
  return "#2e7d32";
}

// Load reports + hotspots
async function loadData() {
  try {
    const [reportsRes, hotspotsRes] = await Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/hotspots").then(r => r.json()),
    ]);

    // Stats
    document.getElementById("statReports").textContent = reportsRes.length;
    document.getElementById("statHotspots").textContent = hotspotsRes.length;
    document.getElementById("statWaste").textContent = reportsRes.reduce(
      (sum, r) => sum + (r.total || 0), 0
    );

    // Draw report pins
    reportsRes.forEach((r) => {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") return;
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: colorFor(r.severity),
        fillOpacity: 0.9,
      }).addTo(map);

      const countsList = Object.entries(r.counts || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("<br>");

      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 0.9rem;">
          <img src="/static/uploads/${r.filename}" alt="report"
               style="width: 200px; border-radius: 6px; margin-bottom: 0.5rem;" />
          <strong>Severity:</strong> ${r.severity}<br>
          <strong>Total items:</strong> ${r.total}<br>
          <hr style="margin: 0.4rem 0;">
          ${countsList}<br>
          <small style="color:#666;">${r.timestamp}</small>
        </div>
      `);
    });

    // Draw hotspot circles
    hotspotsRes.forEach((h) => {
      L.circle([h.lat, h.lng], {
        radius: 100,
        color: colorFor(h.severity),
        fillColor: colorFor(h.severity),
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map).bindPopup(`
        <strong>🔥 Hotspot</strong><br>
        Reports: ${h.report_count}<br>
        Total items: ${h.total_waste}<br>
        Priority score: ${h.priority}
      `);
    });
  } catch (err) {
    console.error("Failed to load map data:", err);
  }
}

loadData();