import base64
from PIL import Image
import io
from pathlib import Path
import os
import torch
import torch.nn.functional as F
import numpy as np
from facenet_pytorch import MTCNN, InceptionResnetV1
from matplotlib import pyplot as plt

env_file = Path(__file__).resolve().parent.parent

SAVED_EMBADDINGS_PATH = env_file / "face_detection_models" / "embaddings.pt"
embadding_list = None
name_list = None

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

mtcnn = MTCNN(device=device, keep_all=False, min_face_size=40)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)


def load_embaddings():
    global embadding_list, name_list
    if os.path.exists(SAVED_EMBADDINGS_PATH):
        saved_data = torch.load(SAVED_EMBADDINGS_PATH)
        embadding_list = saved_data[0].to(device)
        name_list = saved_data[1]
        print(f"Loaded {len(name_list)} embeddings from {SAVED_EMBADDINGS_PATH}")

    else:
        print(f"No saved embeddings found at {SAVED_EMBADDINGS_PATH}")


load_embaddings()


def base64_to_image(base64_str):
    try:
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]

        image_data = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception as e:
        print(f"Error converting image: {e}")
        return None


def get_blur_score(image):
    # Convert PIL image to grayscale numpy array
    img_gray = np.array(image.convert('L'))
    
    # Convert to tensor and add batch/channel dims: (1, 1, H, W)
    img_tensor = torch.from_numpy(img_gray).float().unsqueeze(0).unsqueeze(0).to(device)
    
    # Laplacian kernel
    kernel = torch.tensor([
        [0, 1, 0],
        [1, -4, 1],
        [0, 1, 0]
    ], dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
    
    # Apply convolution
    filtered = F.conv2d(img_tensor, kernel)
    
    # Calculate variance
    return filtered.var().item()


def predict_image(image):
    global embadding_list, name_list

    if embadding_list is None or name_list is None:
        if not load_embaddings():
            return "error", 0, "Database not found.", None

    # 1. Blur Detection
    # Resize for performance if image is too large
    if image.size[0] > 640:
        ratio = 640 / image.size[0]
        new_height = int(image.size[1] * ratio)
        image = image.resize((640, new_height), Image.Resampling.LANCZOS)

    blur_score = get_blur_score(image)
    # print(f"Blur Score: {blur_score}")
    if blur_score < 100:  # Threshold for blurriness
        return "Unknown", 0, "Image too blurry", None

    try:
        # Detect faces and get bounding boxes
        boxes, probs = mtcnn.detect(image)
        
        if boxes is None:
            return "no face", 0, "No face detected", None

        # Get the largest face
        box = boxes[0]
        
        # Crop the face
        img_cropped = mtcnn(image)
        
        if img_cropped is None:
            return "no face", 0, "No face detected", None
        
        confidence = probs[0] if probs is not None else 0

        # 2. Stricter Face Detection Confidence
        if confidence < 0.95:
            return "Unknown", 0, f"Low confidence ({confidence:.2f})", box.tolist()

        image_embadding = resnet(img_cropped.unsqueeze(0).to(device)).detach()

        dist_list = (embadding_list - image_embadding).norm(dim=1)
        min_dist, min_idx = torch.min(dist_list, dim=0)

        # 3. Stricter Matching Threshold
        threshold = 0.65  # Lowered from 0.8 to reduce false positives

        if min_dist.item() < threshold:
            name = name_list[min_idx]
            return name, min_dist.item(), "Prediction successful.", box.tolist()
        else:
            return "Unknown", min_dist.item(), "No match found.", box.tolist()
    except Exception as e:
        print(f"Error during prediction: {e}")
        return "Error", 0, str(e), None


if __name__ == "__main__":
    test_base64_str = ""

    img = Image.open("test.jpg").convert("RGB")
    # image = base64_to_image()
    if img:
        name, distance, message = predict_image(img)
        print(f"Prediction: {name}, Distance: {distance}, Message: {message}")
    else:
        print("Failed to convert base64 string to image.")
