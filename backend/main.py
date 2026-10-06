from fastapi import FastAPI, File, UploadFile, Query, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pathlib import Path
from PIL import Image, ImageOps
from ultralytics import YOLO
from datetime import datetime
import uuid
import json
import math

from detect_utils import nms, tile_windows

app = FastAPI()

# Paths
BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
REPORTS_FILE = BASE_DIR / "reports.json"

# Initialize reports file
if not REPORTS_FILE.exists():
    REPORTS_FILE.write_text("[]")

# Settings
MIN_CONF = 0.10
IMGSZ = 1280

# General (COCO) model waste-like classes
GENERAL_WASTE_CLASSES = {
    "bottle", "cup", "wine glass", "bowl", "fork", "knife", "spoon",
    "banana", "apple", "sandwich", "orange",
}

# Load models once at startup
print("Loading waste model...")
waste_model = YOLO(str(BASE_DIR / "waste_model.pt"))
print("Waste model classes:", waste_model.names)

print("Loading general model...")
general_model = YOLO(str(BASE_DIR / "yolov8n.pt"))
print("Both models loaded.")

# Serve frontend + uploads
app.mount("/static/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


# ---------- Pages ----------
@app.get("/", response_class=HTMLResponse)
async def home():
    with open(FRONTEND_DIR / "index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/map", response_class=HTMLResponse)
async def map_page():
    with open(FRONTEND_DIR / "map.html", encoding="utf-8") as f:
        return f.read()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---------- Detection ----------
def run_model(model, img, windows, allowed=None):
    dets = []
    for (x0, y0, x1, y1) in windows:
        crop = img.crop((x0, y0, x1, y1))
        result = model.predict(crop, conf=MIN_CONF, imgsz=IMGSZ, verbose=False)[0]
        for box in result.boxes:
            name = model.names[int(box.cls[0])]
            if allowed is not None and name not in allowed:
                continue
            bx1, by1, bx2, by2 = box.xyxy[0].tolist()
            dets.append({
                "label": name,
                "conf": float(box.conf[0]),
                "x1": bx1 + x0, "y1": by1 + y0,
                "x2": bx2 + x0, "y2": by2 + y0,
            })
    return dets


def classify_severity(total):
    if total >= 10:
        return "high"
    elif total >= 4:
        return "medium"
    else:
        return "low"


@app.post("/api/detect")
def detect(
    file: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    tiled: bool = Query(True),
):
    img = Image.open(file.file)
    img = ImageOps.exif_transpose(img).convert("RGB")
    w, h = img.size

    filename = f"{uuid.uuid4().hex}.jpg"
    img.save(UPLOAD_DIR / filename, quality=92)

    windows = [(0, 0, w, h)]
    if tiled:
        windows += tile_windows(w, h, grid=2, overlap=0.25)

    dets = run_model(waste_model, img, windows)
    dets += run_model(general_model, img, windows, allowed=GENERAL_WASTE_CLASSES)
    dets = nms(dets, iou_thr=0.5)

    # Count per class
    counts = {}
    for d in dets:
        counts[d["label"]] = counts.get(d["label"], 0) + 1
    total = sum(counts.values())
    severity = classify_severity(total)

    # Build report
    report = {
        "id": filename.replace(".jpg", ""),
        "filename": filename,
        "lat": lat,
        "lng": lng,
        "total": total,
        "counts": counts,
        "severity": severity,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "detections": [
            {
                "label": d["label"],
                "conf": round(d["conf"], 3),
                "x1": d["x1"] / w, "y1": d["y1"] / h,
                "x2": d["x2"] / w, "y2": d["y2"] / h,
            }
            for d in dets
        ],
    }

    # Save to reports.json
    reports = json.loads(REPORTS_FILE.read_text())
    reports.append(report)
    REPORTS_FILE.write_text(json.dumps(reports, indent=2))

    return {
        "id": report["id"],
        "filename": filename,
        "width": w,
        "height": h,
        "min_conf": MIN_CONF,
        "lat": lat,
        "lng": lng,
        "total": total,
        "counts": counts,
        "severity": severity,
        "detections": report["detections"],
    }


# ---------- Reports & Hotspots ----------
@app.get("/api/reports")
async def get_reports():
    reports = json.loads(REPORTS_FILE.read_text())
    return JSONResponse(content=reports)


def haversine_m(lat1, lng1, lat2, lng2):
    """Distance between two GPS points in meters."""
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@app.get("/api/hotspots")
async def get_hotspots():
    """
    A hotspot = location with 2+ reports within 100m.
    Priority score = total_waste*2 + report_count*3
    """
    reports = json.loads(REPORTS_FILE.read_text())
    if not reports:
        return JSONResponse(content=[])

    hotspots = []
    for r in reports:
        neighbors = [
            o for o in reports
            if haversine_m(r["lat"], r["lng"], o["lat"], o["lng"]) <= 100
        ]
        if len(neighbors) >= 2:
            total_waste = sum(n["total"] for n in neighbors)
            priority = total_waste * 2 + len(neighbors) * 3
            avg_lat = sum(n["lat"] for n in neighbors) / len(neighbors)
            avg_lng = sum(n["lng"] for n in neighbors) / len(neighbors)
            hotspots.append({
                "lat": avg_lat,
                "lng": avg_lng,
                "report_count": len(neighbors),
                "total_waste": total_waste,
                "priority": priority,
                "severity": classify_severity(total_waste),
            })

    # Deduplicate nearby hotspots
    deduped = []
    for h in sorted(hotspots, key=lambda x: -x["priority"]):
        if not any(haversine_m(h["lat"], h["lng"], d["lat"], d["lng"]) <= 100 for d in deduped):
            deduped.append(h)

    return JSONResponse(content=deduped)