import torch
from torch.utils.data import Dataset
from PIL import Image
import numpy as np
import os


class PNetDataset(Dataset):
    def __init__(self, ann_file, transform=None):
        super().__init__()

        self.ann = []  ## store all sample

        with open(ann_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if line.endswith("label"):
                    continue
                parts = line.split(
                    ","
                )  ## split in image_path label dx1,dy1,dx2,dy2 (if present)
                # print(parts)
                path = parts[0]
                label = (
                    0
                    if parts[1] == -1
                    and parts[2] == -1
                    and parts[3] == -1
                    and parts[4] == -1
                    else 1
                )
                if label == 0:
                    dx = [0.0, 0.0, 0.0, 0.0]
                else:
                    dx = list(map(float, parts[1:5]))
                self.ann.append((path, label, dx))
        self.transform = transform

    def __len__(self):
        return len(self.ann)

    def __getitem__(self, index):
        path, label, dx = self.ann[index]
        img = Image.open(path).convert("RGB").resize((12, 12))
        img = np.asarray(img).astype(np.float32)
        img = (img - 127.5) / 128
        img = np.transpose(img, (2, 0, 1))

        sample = {
            "img": torch.tensor(img, dtype=torch.float32),
            "label": torch.tensor(label, dtype=torch.long),
            "box_target": torch.tensor(dx, dtype=torch.float32),
        }

        if self.transform:
            sample = self.transform(sample)
        return sample
