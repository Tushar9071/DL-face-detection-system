import torch
from PIL import Image
import io, os
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch
from PIL import Image
import io, os
from facenet_pytorch import MTCNN, InceptionResnetV1


def predict_faces_from_bytes(
    image_bytes, embedding_list, name_list, mtcnn, resnet, device
):
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return {"error": f"Invalid image: {e}"}

    faces_cropped, probs = mtcnn(img, return_prob=True)

    if faces_cropped is None:
        return {"status": "no_face_detected", "matches": []}

    results = []

    for i, face_tensor in enumerate(faces_cropped):

        face_tensor = face_tensor.unsqueeze(0).to(device)

        emb = resnet(face_tensor).detach()
        emb = emb / emb.norm()

        dist_list = (embedding_list - emb).norm(dim=1)

        min_dist, min_idx = torch.min(dist_list, dim=0)
        min_dist_val = min_dist.item()

        threshold = 0.8

        if min_dist_val < threshold:
            results.append(
                {
                    "face_index": i + 1,
                    "status": "Match",
                    "name": name_list[min_idx],
                    "confidence_score": round(1 - min_dist_val, 4),
                }
            )
        else:
            results.append(
                {
                    "face_index": i + 1,
                    "status": "Unknown",
                    "distance": round(min_dist_val, 4),
                }
            )

    return {"status": "success", "count": len(results), "matches": results}


if __name__ == "__main__":
    image_path = "tushar_yugal.jpg"

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running on: {device}")

    mtcnn = MTCNN(keep_all=True, device=device)
    resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)

    if os.path.exists("embaddings.pt"):
        saved_data = torch.load("embaddings.pt")
        embedding_list = saved_data[0].to(device)
        name_list = saved_data[1]

        if os.path.exists(image_path):
            with open(image_path, "rb") as img_file:
                image_bytes = img_file.read()

            result = predict_faces_from_bytes(
                image_bytes, embedding_list, name_list, mtcnn, resnet, device
            )
            print(result)
        else:
            print(f"Image {image_path} not found.")
    else:
        print("embaddings.pt not found.")
