from fastapi import FastAPI, File, UploadFile, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path
from PIL import Image, ImageOps
from ultralytics import YOLO
import uuid

from detect_utils import nms, tile_windows

app = FastAPI()

# Paths
BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

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

# Serve frontend files
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def home():
    with open(FRONTEND_DIR / "index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


def run_model(model, img, windows, allowed=None):
    """Run one model over crop windows; return boxes in full-image pixels."""
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


@app.post("/api/detect")
def detect(file: UploadFile = File(...), tiled: bool = Query(True)):
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

    return {
        "filename": filename,
        "width": w,
        "height": h,
        "min_conf": MIN_CONF,
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