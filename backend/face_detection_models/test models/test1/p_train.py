import torch
from p_net import PNet
from p_dataset import PNetDataset
from p_losses import multitask_loss
from torch.utils.data import DataLoader
from tqdm import tqdm
import os


def train(
    ann_file: str,
    batch_size: int = 64,
    epochs: int = 20,
    lr: float = 1e-3,
    ckpt_dir: str = "checkpoints",
    step_size: int = 6,
    box_weight=0.5,
):

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = PNet().to(device)

    dataset = PNetDataset(ann_file=ann_file)
    loader = DataLoader(
        dataset, batch_size=batch_size, shuffle=True, num_workers=4, drop_last=True
    )

    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.StepLR(
        optimizer=optimizer, step_size=step_size, gamma=0.1
    )

    start_epoch = 0
    best_loss = 1e9

    os.makedirs(ckpt_dir, exist_ok=True)

    for epoch in range(start_epoch, epochs):
        model.train()
        running_loss = 0.0
        running_cls = 0.0
        running_box = 0.0

        pbar = tqdm(enumerate(loader), total=len(loader))

        for i, batch in pbar:
            imgs = batch["img"].to(device)
            labels = batch["label"].to(device)
            box_target = batch["box_target"].to(device)

            cls_out, box_out, *_ = model(imgs)

            cls_out_pool = torch.mean(
                cls_out.view(cls_out.size(0), cls_out.size(1), -1), dim=2
            )  # Bx2
            bbox_out_pool = torch.mean(
                box_out.view(box_out.size(0), box_out.size(1), -1), dim=2
            )  # Bx4

            # reshape to match loss function - make them BxCx1x1 temporarily
            cls_out_pool = cls_out_pool.unsqueeze(-1).unsqueeze(-1)  # Bx2x1x1
            bbox_out_pool = bbox_out_pool.unsqueeze(-1).unsqueeze(-1)  # Bx4x1x1

            loss, lcls, lbbox = multitask_loss(
                cls_out_pool,
                bbox_out_pool,
                labels.unsqueeze(-1).unsqueeze(-1),
                box_target.unsqueeze(-1).unsqueeze(-1),
                box_weight=box_weight,
            )

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            running_cls += lcls
            running_box += lbbox

            pbar.set_description(
                f"Epoch[{epoch}/{epochs}] Loss:{running_loss/(i+1):.4f} Cls:{running_cls/(i+1):.4f} Bbox:{running_box/(i+1):.4f}"
            )

        scheduler.step()

        epoch_loss = running_loss / len(loader)
        # save checkpoint
        ckpt_path = os.path.join(ckpt_dir, f"pnet_epoch{epoch}.pth")
        torch.save(
            {
                "epoch": epoch,
                "model_state": model.state_dict(),
                "optimizer": optimizer.state_dict(),
            },
            ckpt_path,
        )

        if epoch_loss < best_loss:
            best_loss = epoch_loss
            torch.save(
                {"epoch": epoch, "model_state": model.state_dict()},
                os.path.join(ckpt_dir, "pnet_best.pth"),
            )

    print("Training finished. Best loss:", best_loss)


if __name__ == "__main__":
    train(ann_file="face_bboxes.csv", ckpt_dir="ckpts_pnet")
