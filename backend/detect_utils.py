"""Pure helper functions (no model loading) so they are easy to test."""
import math


def iou(a, b):
    ix1, iy1 = max(a["x1"], b["x1"]), max(a["y1"], b["y1"])
    ix2, iy2 = min(a["x2"], b["x2"]), min(a["y2"], b["y2"])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    area_a = (a["x2"] - a["x1"]) * (a["y2"] - a["y1"])
    area_b = (b["x2"] - b["x1"]) * (b["y2"] - b["y1"])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def nms(dets, iou_thr=0.5):
    """Class-agnostic NMS: if two boxes cover the same object (even if two
    different models gave it different names), keep the more confident one."""
    kept = []
    for d in sorted(dets, key=lambda d: d["conf"], reverse=True):
        if all(iou(d, k) < iou_thr for k in kept):
            kept.append(d)
    return kept


def tile_windows(w, h, grid=2, overlap=0.25):
    """Overlapping crops (x0, y0, x1, y1) that together cover the image."""
    tw = min(w, math.ceil(w / (grid - (grid - 1) * overlap)))
    th = min(h, math.ceil(h / (grid - (grid - 1) * overlap)))
    xs = [round(i * (w - tw) / (grid - 1)) for i in range(grid)]
    ys = [round(i * (h - th) / (grid - 1)) for i in range(grid)]
    return [(x, y, x + tw, y + th) for y in ys for x in xs]