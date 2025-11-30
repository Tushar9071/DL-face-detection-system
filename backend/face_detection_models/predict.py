import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import os
import sys

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"Running on device: {device}")

mtcnn = MTCNN(
    image_size=160,
    margin=0,
    min_face_size=20,
    thresholds=[0.6, 0.7, 0.7],
    factor=0.709,
    post_process=True,
    device=device,
)

resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)

SAVED_DATA_PATH = "embaddings.pt"

if os.path.exists(SAVED_DATA_PATH):
    saved_data = torch.load(SAVED_DATA_PATH)
    embedding_list = saved_data[0].to(device)
    name_list = saved_data[1]
    print(f"Loaded {len(name_list)} students from database.")
else:
    print(f"Error: {SAVED_DATA_PATH} not found. Run training first.")
    sys.exit()


def predict_face(image_path):
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"Could not open image: {e}")
        return

    img_cropped = mtcnn(img)

    if img_cropped is None:
        return "No face detected"

    img_embedding = resnet(img_cropped.unsqueeze(0).to(device)).detach()

    dist_list = (embedding_list - img_embedding).norm(dim=1)

    min_dist, min_idx = torch.min(dist_list, dim=0)

    threshold = 0.8

    if min_dist.item() > threshold:
        return f"Unknown (Distance: {min_dist.item():.2f})"
    else:
        name = name_list[min_idx]
        return f"Match: {name} (Confidence: {min_dist.item():.2f})"


if __name__ == "__main__":
    test_image = "tushar_yugal.jpg"

    if os.path.exists(test_image):
        result = predict_face(test_image)
        print(result)
    else:
        print(f"Please place a file named '{test_image}' to test.")
