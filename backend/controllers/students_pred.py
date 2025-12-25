import base64
from PIL import Image
import io
from pathlib import Path
import os
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from matplotlib import pyplot as plt

env_file = Path(__file__).resolve().parent.parent

SAVED_EMBADDINGS_PATH = env_file / "face_detection_models" / "embaddings.pt"
embadding_list = None
name_list = None

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

mtcnn = MTCNN(device=device)
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


def predict_image(image):
    global embadding_list, name_list

    if embadding_list is None or name_list is None:
        if not load_embaddings():
            return "error", 0, "Database not found."

    try:
        img_cropped, pred = mtcnn(image, return_prob=True)

        # plt.imshow(img_cropped.permute(1, 2, 0).cpu())
        # plt.axis("off")
        # plt.show()

        if img_cropped is None:
            return "no face", 0, "No face detected"
        confidence = pred if isinstance(pred, float) else pred.item()

        if confidence < 0.90:
            return "Unknown", 0, f"Low confidence ({pred:.2f})"

        image_embadding = resnet(img_cropped.unsqueeze(0).to(device)).detach()

        dist_list = (embadding_list - image_embadding).norm(dim=1)
        min_dist, min_idx = torch.min(dist_list, dim=0)

        threshold = 0.8

        if min_dist.item() < threshold:
            name = name_list[min_idx]
            return name, min_dist.item(), "Prediction successful."
        else:
            return "Unknown", min_dist.item(), "No match found."
    except Exception as e:
        print(f"Error during prediction: {e}")
        return "Error", 0, str(e)


if __name__ == "__main__":
    test_base64_str = ""

    img = Image.open("test.jpg").convert("RGB")
    # image = base64_to_image()
    if img:
        name, distance, message = predict_image(img)
        print(f"Prediction: {name}, Distance: {distance}, Message: {message}")
    else:
        print("Failed to convert base64 string to image.")
