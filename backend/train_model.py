from ultralytics import YOLO
from pathlib import Path

def main():
    DATA_YAML = Path(__file__).parent / "waste_dataset" / "data.yaml"

    print("Starting training...")
    print("Dataset:", DATA_YAML)

    model = YOLO("yolov8n.pt")

    results = model.train(
        data=str(DATA_YAML),
        epochs=50,
        imgsz=640,
        batch=16,
        device=0,
        workers=2,          # reduced from 4 — safer on Windows
        project="runs",
        name="waste_train",
        patience=10,
        save=True,
        plots=True,
    )

    print("\n" + "=" * 50)
    print("TRAINING COMPLETE")
    print("=" * 50)
    print("Best model:", Path("runs/waste_train/weights/best.pt").absolute())


if __name__ == "__main__":
    main()