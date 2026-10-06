<div align="center">

# WasteHotspot AI

**AI-powered waste detection and hotspot mapping for Dhaka, Bangladesh**

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-purple)](https://github.com/ultralytics/ultralytics)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Overview](#overview) | [Features](#features) | [How It Works](#how-it-works) | [Tech Stack](#tech-stack) | [Model Performance](#model-performance) | [Getting Started](#getting-started) | [Project Structure](#project-structure) | [Author](#author)

</div>

---

## Overview

Waste management is a growing challenge in Bangladesh, particularly in the crowded areas of Dhaka. Waste is frequently dumped along roadsides, near markets, drains, and canals, and often remains for days because there is no system to identify which locations need immediate attention.

WasteHotspot AI addresses this problem by combining four components:

- **AI detection:** a YOLOv8 model identifies and counts waste items in photos across six classes.
- **GPS-tagged reports:** every upload is stored with its location and timestamp.
- **Interactive hotspot map:** waste clusters are visualized across Dhaka.
- **Priority scoring:** hotspots are ranked so cleanup teams know where to go first.

**Vision:** a low-cost, scalable, data-driven waste monitoring system for every city in Bangladesh.

---

## Features

### AI Detection
- Custom-trained YOLOv8 model on 10,099 images
- Six waste classes: Biodegradable, Cardboard, Glass, Metal, Paper, Plastic
- Tiled inference for detecting small objects in large photos
- Non-Maximum Suppression (NMS) to merge overlapping detections across tiles
- Dual-model approach (custom waste model and general COCO model) for broader coverage

### Location and Reporting
- Browser GPS integration through a "Use My Location" button
- Manual latitude/longitude input as a fallback
- Every detection is saved with a timestamp and location

### Interactive Map
- Built with Leaflet and OpenStreetMap (no API keys required)
- Color-coded pins by severity (green, yellow, red)
- Hotspot circles with a 100 m radius and priority score
- Popups showing the image, class breakdown, and timestamp
- Sidebar with a ranked hotspot list

### Dashboard
- Summary metrics: total reports, total items, hotspots, and averages
- Cleanup priority table ranked by priority score
- Class distribution chart
- Recent reports gallery

### User Interface
- Responsive layout for mobile, tablet, and desktop
- Drag-and-drop image upload
- Consistent design system across all pages

---

## How It Works

```
+----------------+     +----------------+     +----------------+
|  User takes a  | --> |  Upload via    | --> |  YOLOv8        |
|  photo of      |     |  web app with  |     |  detects and   |
|  waste         |     |  GPS tag       |     |  counts items  |
+----------------+     +----------------+     +----------------+
                                                      |
                                                      v
+----------------+     +----------------+     +----------------+
|  Dashboard     | <-- |  Hotspot       | <-- |  Saved to      |
|  shows top     |     |  engine        |     |  reports.json  |
|  priorities    |     |  (100 m radius)|     |  and shown on  |
+----------------+     +----------------+     |  the map       |
                                              +----------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| AI / Computer Vision | YOLOv8, PyTorch, OpenCV, Pillow | Waste detection |
| Backend | FastAPI, Uvicorn, Python 3.12 | REST API |
| Frontend | HTML, CSS, JavaScript, Tailwind CDN | User interface |
| Map | Leaflet.js, OpenStreetMap | Interactive map |
| Data | JSON files, Roboflow | Report storage and dataset |
| Training Hardware | NVIDIA RTX 4050 (6 GB VRAM) | Model training |

---

## Model Performance

The model was trained on the [Roboflow Universe Garbage Model dataset](https://universe.roboflow.com/iu-school/garbage-model-yuwzy) (10,099 images, 6 classes).

### Validation Results (50 epochs, approx. 51 minutes)

| Class | Precision | Recall | mAP@50 | Notes |
|---|---|---|---|---|
| Glass | 0.843 | 0.675 | 0.789 | Best performing class |
| Metal | 0.679 | 0.623 | 0.658 | Strong |
| Biodegradable | 0.813 | 0.466 | 0.616 | High precision, lower recall |
| Cardboard | 0.687 | 0.485 | 0.580 | Good |
| Plastic | 0.367 | 0.515 | 0.384 | Needs more training data |
| Paper | 0.034 | 0.061 | 0.067 | Very few training samples |
| **Overall** | **0.570** | **0.471** | **0.516** | mAP@50-95: 0.352 |

### Training Configuration

| Parameter | Value |
|---|---|
| Base model | `yolov8n.pt` (nano) |
| Image size | 640 x 640 |
| Batch size | 16 |
| Epochs | 50 (early stopping, patience = 10) |
| Optimizer | AdamW (auto-selected) |
| Hardware | NVIDIA RTX 4050 (6 GB) |
| Training time | Approx. 51 minutes |

### Known Limitations
- Paper and Plastic accuracy is limited by the dataset (15 and 85 samples respectively, compared with more than 13,000 for Biodegradable).
- The model was trained mostly on clean product images, so real street scenes are more challenging.
- **Planned improvement:** fine-tune on the [BDWaste dataset](https://data.mendeley.com/datasets/96g5pgfnfw/1) (2,497 Bangladesh-specific images).

---

## Getting Started

### Prerequisites
- Python 3.12 (Python 3.14 is not supported because PyTorch CUDA wheels are not yet available)
- NVIDIA GPU with CUDA 12.1 for training (inference works on CPU)
- Node.js (optional, only needed for a future React migration)

### 1. Clone the Repository

```bash
git clone https://github.com/imtanjilsarkar/wastehotspot-ai.git
cd wastehotspot-ai
```

### 2. Set Up the Backend Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

For GPU training, install the CUDA build of PyTorch by following the instructions at [pytorch.org](https://pytorch.org/get-started/locally/).

### 4. Download the Dataset (Training Only)

The dataset is approximately 5 GB and is not included in this repository. It is only required if you want to retrain the model. A pre-trained model (`waste_model.pt`) is included for inference.

1. Open the [dataset page](https://universe.roboflow.com/iu-school/garbage-model-yuwzy).
2. Click **Fork Dataset**, then **Download Dataset**.
3. Select the **YOLOv8** format.
4. Extract the files to `backend/waste_dataset/`.

To retrain the model:

```bash
python train_model.py
```

### 5. Run the Backend

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`, with interactive documentation at `http://127.0.0.1:8000/docs`.

### 6. Run the Frontend

In a separate terminal, serve the `frontend` directory with any static file server:

```bash
cd frontend
python -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

---

## Project Structure

```
wastehotspot-ai/
├── backend/
│   ├── main.py              # FastAPI application (4 endpoints)
│   ├── detect_utils.py      # IoU, NMS, and tiling helpers
│   ├── train_model.py       # YOLOv8 training script
│   ├── test_detect.py       # Quick detection test script
│   ├── requirements.txt     # Python dependencies
│   ├── waste_model.pt       # Trained YOLOv8 model (6 MB)
│   ├── reports.json         # User reports (auto-generated)
│   └── uploads/             # Uploaded images (auto-generated)
├── frontend/
│   ├── index.html           # Upload page
│   ├── map.html             # Interactive map
│   ├── dashboard.html       # Analytics dashboard
│   ├── style.css            # Shared design system
│   ├── app.js               # Upload logic
│   ├── map.js               # Leaflet map logic
│   └── dashboard.js         # Dashboard logic
├── README.md
└── .gitignore
```

---

## Deployment

| Component | Platform | Status |
|---|---|---|
| Web app | Vercel | Coming soon |
| API | Hugging Face Spaces | Coming soon |

---

## Roadmap

- Fine-tune the model on Bangladesh-specific waste data (BDWaste)
- Improve detection accuracy for Paper and Plastic classes
- Deploy the web app and API publicly
- Migrate the frontend to React
- Replace JSON storage with a database

---

## Author

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/imtanjilsarkar">
        <img src="https://github.com/imtanjilsarkar.png" width="100px;" alt="Tanjil Sarkar"/><br>
        <sub><b>Tanjil Sarkar</b></sub>
      </a><br>
      <sub>Full-stack and AI</sub>
    </td>
  </tr>
</table>

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) for the detection framework
- [Roboflow Universe](https://universe.roboflow.com/) for the training dataset
- [OpenStreetMap](https://www.openstreetmap.org/) for map tiles
- [Leaflet](https://leafletjs.com/) for the interactive map library
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework

---

<div align="center">

Built for a cleaner Bangladesh.

</div>
