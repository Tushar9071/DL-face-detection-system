import torch
import torch.nn as nn
import torch.nn.functional as F


class PNet(nn.Module):
    def __init__(self):
        super().__init__()
        ## if we have 3*12*12 image
        self.conv1 = nn.Conv2d(
            in_channels=3, out_channels=10, kernel_size=3, padding=1, stride=1
        )  ##out put is 10*12*12 because we make more filler from 3 to 10 but can change in hight and width
        self.prelu1 = nn.PReLU(
            num_parameters=10
        )  # it work like ReLU but with a.x  if x>0 then 0 other wise a.x if x<=0
        self.poo1 = nn.MaxPool2d(
            kernel_size=2, stride=2
        )  ## output will be 10*6*6 because here out_size = ((in_size-kernel_size+pedding)/stride)+1 so here  out_size = ((12-2+0)/2)+1 = 6 so out_size  = 6*6

        self.conv2 = nn.Conv2d(
            in_channels=10, out_channels=16, kernel_size=3, padding=1, stride=1
        )
        self.prelu2 = nn.PReLU(16)

        self.conv3 = nn.Conv2d(
            in_channels=16, out_channels=32, kernel_size=3, padding=1, stride=1
        )
        self.prelu3 = nn.PReLU(32)

        self.conv_class = nn.Conv2d(
            in_channels=32, out_channels=2, kernel_size=1
        )  ## predict class if face in image
        self.conv_face_box = nn.Conv2d(
            in_channels=32, out_channels=4, kernel_size=1
        )  ## if face in image then give cordinet from Image
        self.conv_landm = nn.Conv2d(32, 10, kernel_size=1)  ## optional

        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, mean=0, std=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, x):

        # x : [B,3,12,12] here B is batch size

        x = self.conv1(x)
        x = self.prelu1(x)
        x = self.poo1(x)
        x = self.conv2(x)
        x = self.prelu2(x)
        x = self.conv3(x)
        x = self.prelu3(x)

        cls = self.conv_class(x)
        face_box = self.conv_face_box(x)
        landm = self.conv_landm(x)

        return cls, face_box, landm
