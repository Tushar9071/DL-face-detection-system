import torch
from torch import nn

class_loss_fn = nn.CrossEntropyLoss(
    reduction="none"
)  # this is for binory classification
box_loss_fn = nn.SmoothL1Loss(reduction="none")  # fro regression problem


def multitask_loss(cls_prob, box_pred, labels, box_target, box_weight=0.5):

    # flutten values
    cls_pred = cls_prob.permute(0, 2, 3, 1).reshape(-1, 2)
    box_pred = box_pred.permute(0, 2, 3, 1).reshape(-1, 4)
    labels_flat = labels.view(-1)
    N = labels.numel()

    cls_loss = class_loss_fn(cls_pred, labels_flat)

    pos_mask = labels_flat > 0

    box_loss = (
        box_loss_fn(box_pred[pos_mask], box_target.view(-1, 4)[pos_mask])
        if pos_mask.sum() > 0
        else torch.tensor(0.0)
    )

    cls_loss = cls_loss.mean()
    if isinstance(box_loss, torch.Tensor):
        if box_loss.dim() > 0:
            box_loss = box_loss.mean()
        else:
            box_loss = box_loss
    else:
        box_loss = box_loss

    loss = cls_loss + box_weight * box_loss

    return (
        loss,
        cls_loss.item(),
        box_loss.item() if isinstance(box_loss, torch.Tensor) else float(box_loss),
    )
