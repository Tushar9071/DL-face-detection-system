import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from torchvision import datasets
from torch.utils.data import DataLoader
import os
from dotenv import load_dotenv
from pathlib import Path
load_dotenv()


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

mtcnn = MTCNN(device=device)

resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)


def collate_fn(x):
    return x[0]



def build_database_centroid():
    env_path = os.getenv("IMAGES_PATH")
    current_file_parent  = Path(__file__).resolve().parent
    datasets_path = (current_file_parent.parent / env_path).resolve() 
    

    if not os.path.exists(datasets_path):
        raise FileNotFoundError(f"The specified path {datasets_path} does not exist.")

    dataset = datasets.ImageFolder(str(datasets_path))

    dataset.index_to_class = {i: c for c, i in dataset.class_to_idx.items()}
    loader = DataLoader(dataset, collate_fn=collate_fn)

    tmp_embaddings = {}

    print("Building embeddings...")

    for x, y in loader:
        enrollment_number = dataset.index_to_class[y]
        x_aligned, prob = mtcnn(x, return_prob=True)

        if x_aligned is not None and prob > 0.90:
            x_aligned = x_aligned.unsqueeze(0).to(device)
            embadding = resnet(x_aligned).detach().cpu()

            if enrollment_number not in tmp_embaddings:
                tmp_embaddings[enrollment_number] = []

            tmp_embaddings[enrollment_number].append(embadding)

    final_embaddings = []
    final_name = []

    print("Averaging vectors per student...")

    for name, vector_list in tmp_embaddings.items():
        if len(vector_list) > 0:
            stacked_vectors = torch.cat(vector_list)
            mean_embadding = torch.mean(stacked_vectors, dim=0)
            final_embaddings.append(mean_embadding)
            final_name.append(name)

        if len(final_embaddings) > 0:
            final_embaddings_tensor = torch.stack(final_embaddings)
            torch.save([final_embaddings_tensor, final_name], "embaddings.pt")
            print("Embaddings saved to embaddings.pt")
        else:
            print("No face found to build embeddings.")


if __name__ == "__main__":
    build_database_centroid()
