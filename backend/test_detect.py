from ultralytics import YOLO
from huggingface_hub import hf_hub_download

# Download the weights file explicitly
model_path = hf_hub_download(
    repo_id="HrutikAdsare/waste-detection-yolov8",
    filename="best.pt"
)

# Load the model from the local downloaded file
model = YOLO(model_path)

# Run detection
results = model("your_waste_image.jpg", conf=0.5)

for r in results:
    print(f"Detected {len(r.boxes)} objects")
    for box in r.boxes:
        class_name = model.names[int(box.cls[0])]
        confidence = float(box.conf[0])
        print(f"  - {class_name}: {confidence:.2f}")