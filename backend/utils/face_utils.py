import torch
from facenet_pytorch import InceptionResnetV1, MTCNN
from PIL import Image
import os
from pathlib import Path
from controllers.students_pred import load_embaddings

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

mtcnn = MTCNN(device=device)

resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)

current_file_dir = Path(__file__).resolve().parent
models_dir = (current_file_dir.parent / "face_detection_models").resolve()

EMBADDINGS_PATH = (models_dir / "embaddings.pt").resolve()
print(f"Embaddings path: {EMBADDINGS_PATH}")


def load_or_create_embeddings(path: str):
    if os.path.exists(path):
        try:
            data = torch.load(path, map_location="cpu")
            embeddings, names = data[0], data[1]

            if embeddings.ndim == 1:
                embeddings = embeddings.unsqueeze(0)

            embeddings = embeddings.to(torch.float32)
            return embeddings, names
        except Exception as e:
            print("Error reading embedding file:", e)

    return torch.empty((0, 512), dtype=torch.float32), []


def update_student_dataset_embaddings(enrollment_number: str, image_path: str):
    print(f"Processing {len(image_path)} images for student {enrollment_number}...")

    vectors = []

    for path in image_path:
        try:
            img = Image.open(path)
            img_cropped, prob = mtcnn(img, return_prob=True)
            if img_cropped is not None and prob > 0.90:
                img_cropped = img_cropped.unsqueeze(0).to(device)
                embadding = resnet(img_cropped).detach().cpu()
                vectors.append(embadding)
            else:
                print(f"Face not detected or low probability ({prob}) in image: {path}")
        except Exception as e:
            print(f"skipping image {path} due to error: {e}")
    print(
        f"Found {len(vectors)} valid face embeddings for student {enrollment_number}."
    )
    if len(vectors) == 0:
        print(f"No valid face embeddings found for student {enrollment_number}.")
        return False

    stacked_vectors = torch.cat(vectors)
    mean_embadding = torch.mean(stacked_vectors, dim=0)

    # mean_embadding = (
    #     mean_embadding / mean_embadding.norm()
    # )  ## also we can you mean_embadding.unsqueeze(0)

    mean_embadding = torch.nn.functional.normalize(mean_embadding, p=2, dim=0)

    existing_embeddings_tensor, existing_names = load_or_create_embeddings(
        EMBADDINGS_PATH
    )

    if enrollment_number in existing_names:
        idx = existing_names.index(enrollment_number)
        print(f"Updating existing embedding for student {enrollment_number}.")

    new_embeddings_tensor = torch.cat(
        (existing_embeddings_tensor, mean_embadding.unsqueeze(0)), dim=0
    )
    existing_names.append(enrollment_number)

    torch.save([new_embeddings_tensor, existing_names], EMBADDINGS_PATH)
    load_embaddings()
    print(f"Embaddings updated and saved to {EMBADDINGS_PATH}")

    return True
