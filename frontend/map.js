// ============================================
// WasteHotspot AI — Map Page
// ============================================

const DHAKA = [23.8103, 90.4125];
const map = L.map("map").setView(DHAKA, 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);

function colorFor(severity) {
  if (severity === "high") return "#ef4444";
  if (severity === "medium") return "#f59e0b";
  return "#10b981";
}

// Keep track of markers by hotspot index for sidebar click
const hotspotMarkers = [];

async function loadData() {
  try {
    const [reports, hotspots] = await Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/hotspots").then(r => r.json()),
    ]);

    // Stats
    animateNumber("statReports", reports.length);
    animateNumber("statHotspots", hotspots.length);
    animateNumber("statWaste", reports.reduce((s, r) => s + (r.total || 0), 0));

    // Report pins
    reports.forEach((r) => {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") return;
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: colorFor(r.severity),
        fillOpacity: 0.95,
      }).addTo(map);

      const countsList = Object.entries(r.counts || {})
        .map(([k, v]) => `<div style="display:flex;justify-content:space-between;"><span>${k}</span><strong>${v}</strong></div>`)
        .join("");

      marker.bindPopup(`
        <div style="font-family: Inter, system-ui; font-size: 0.9rem; min-width: 220px;">
          <img src="/static/uploads/${r.filename}" alt="report"
               style="width: 100%; border-radius: 8px; margin-bottom: 0.6rem;" />
          <div style="margin-bottom: 0.4rem;">
            <span class="badge badge-${r.severity}">${r.severity}</span>
          </div>
          <strong>Total items:</strong> ${r.total}<br>
          <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid #e5e7eb;">
          ${countsList}
          <div style="color:#9ca3af;font-size:0.75rem;margin-top:0.5rem;">
            ${new Date(r.timestamp).toLocaleString()}
          </div>
        </div>
      `);
    });

    // Hotspot circles + sidebar list
    hotspots.sort((a, b) => b.priority - a.priority);
    const hotspotList = document.getElementById("hotspotList");

    if (hotspots.length === 0) {
      hotspotList.innerHTML = '<p style="color: var(--gray-600); font-size: 0.9rem;">No hotspots yet — need 2+ reports within 100m.</p>';
    } else {
      hotspotList.innerHTML = "";
      hotspots.forEach((h, i) => {
        const circle = L.circle([h.lat, h.lng], {
          radius: 100,
          color: colorFor(h.severity),
          fillColor: colorFor(h.severity),
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map).bindPopup(`
          <div style="font-family: Inter, system-ui;">
            <strong style="font-size: 1rem;">🔥 Hotspot #${i + 1}</strong><br>
            <div style="margin: 0.4rem 0;"><span class="badge badge-${h.severity}">${h.severity}</span></div>
            <strong>Reports:</strong> ${h.report_count}<br>
            <strong>Total items:</strong> ${h.total_waste}<br>
            <strong>Priority score:</strong> ${h.priority}
          </div>
        `);
        hotspotMarkers.push(circle);

        const item = document.createElement("div");
        item.className = "hotspot-item";
        item.innerHTML = `
          <div class="hotspot-rank">#${i + 1}</div>
          <div class="hotspot-info">
            <strong style="font-size:0.9rem;">${h.report_count} reports, ${h.total_waste} items</strong>
            <div class="hotspot-priority">
              Priority: ${h.priority} · Severity: <span style="color:${colorFor(h.severity)}; font-weight:600;">${h.severity}</span>
            </div>
          </div>
        `;
        item.addEventListener("click", () => {
          map.setView([h.lat, h.lng], 16);
          circle.openPopup();
        });
        hotspotList.appendChild(item);
      });
    }
  } catch (err) {
    console.error("Failed to load map data:", err);
  }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function update(currentTime) {
    const progress = Math.min((currentTime - startTime) / 800, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

loadData();