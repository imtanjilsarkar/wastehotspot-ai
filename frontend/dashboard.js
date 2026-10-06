// ============================================
// WasteHotspot AI — Dashboard
// ============================================

const CLASS_COLORS = {
  PLASTIC: "#3b82f6",
  BIODEGRADABLE: "#10b981",
  PAPER: "#f59e0b",
  GLASS: "#8b5cf6",
  METAL: "#6b7280",
  CARDBOARD: "#a16207",
};

async function loadDashboard() {
  try {
    const [reports, hotspots] = await Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/hotspots").then(r => r.json()),
    ]);

    // ---- Top stats ----
    const totalItems = reports.reduce((s, r) => s + (r.total || 0), 0);
    const avg = reports.length ? (totalItems / reports.length).toFixed(1) : 0;

    animateNumber("dashReports", reports.length);
    animateNumber("dashItems", totalItems);
    animateNumber("dashHotspots", hotspots.length);
    document.getElementById("dashAvg").textContent = avg;

    // ---- Priority list ----
    const priorityList = document.getElementById("priorityList");
    if (hotspots.length === 0) {
      priorityList.innerHTML = '<p style="color: var(--gray-600); font-size: 0.9rem;">No hotspots yet — need 2+ reports within 100m.</p>';
    } else {
      priorityList.innerHTML = "";
      hotspots.sort((a, b) => b.priority - a.priority);
      hotspots.forEach((h, i) => {
        const row = document.createElement("div");
        row.className = "priority-row";
        row.innerHTML = `
          <div class="priority-rank">#${i + 1}</div>
          <div>
            <div>${h.report_count} reports · ${h.total_waste} items</div>
            <div class="priority-loc">${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</div>
          </div>
          <div class="priority-score">${h.priority}</div>
          <div class="priority-count ${h.severity}">${h.severity}</div>
        `;
        priorityList.appendChild(row);
      });
    }

    // ---- Class distribution ----
    const classTotals = {};
    reports.forEach(r => {
      Object.entries(r.counts || {}).forEach(([k, v]) => {
        classTotals[k] = (classTotals[k] || 0) + v;
      });
    });

    const classList = document.getElementById("classDistribution");
    const entries = Object.entries(classTotals).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      classList.innerHTML = '<li style="color: var(--gray-600);">No data yet.</li>';
    } else {
      classList.innerHTML = "";
      const max = entries[0][1];
      entries.forEach(([name, count]) => {
        const pct = (count / max) * 100;
        const color = CLASS_COLORS[name] || "#10b981";
        const li = document.createElement("li");
        li.className = "class-item";
        li.style.borderLeftColor = color;
        li.innerHTML = `
          <span class="class-name">${name}</span>
          <div style="flex:1; margin: 0 0.75rem;">
            <div style="background: var(--gray-200); height: 6px; border-radius: 999px; overflow: hidden;">
              <div style="background: ${color}; width: ${pct}%; height: 100%; transition: width 1s;"></div>
            </div>
          </div>
          <span class="class-count" style="background: ${color};">${count}</span>
        `;
        classList.appendChild(li);
      });
    }

    // ---- Recent reports ----
    const recentGrid = document.getElementById("recentGrid");
    const recent = [...reports].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 6);

    if (recent.length === 0) {
      recentGrid.innerHTML = '<p style="color: var(--gray-600); font-size: 0.9rem;">No reports yet.</p>';
    } else {
      recentGrid.innerHTML = "";
      recent.forEach(r => {
        const card = document.createElement("div");
        card.className = "recent-card";
        card.innerHTML = `
          <img src="/static/uploads/${r.filename}" alt="report"
               onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22130%22><rect fill=%22%23e5e7eb%22 width=%22200%22 height=%22130%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2214%22>No image</text></svg>'" />
          <div class="recent-info">
            <strong>${r.total} items</strong><br>
            <span class="badge badge-${r.severity}" style="font-size:0.65rem; margin-top:0.3rem; display:inline-block;">${r.severity}</span>
            <div><small>${new Date(r.timestamp).toLocaleString()}</small></div>
          </div>
        `;
        card.addEventListener("click", () => {
          window.location.href = "/map";
        });
        recentGrid.appendChild(card);
      });
    }

  } catch (err) {
    console.error("Dashboard load failed:", err);
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

loadDashboard();