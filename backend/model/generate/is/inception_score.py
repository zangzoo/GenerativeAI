import torch
from torch import nn
from torch.autograd import Variable
from torch.nn import functional as F
import torch.utils.data

from torchvision.models.inception import inception_v3

import numpy as np
from scipy.stats import entropy

import glob
from PIL import Image

from argparse import ArgumentDefaultsHelpFormatter, ArgumentParser

from tqdm import tqdm

parser = ArgumentParser(formatter_class=ArgumentDefaultsHelpFormatter)
parser.add_argument('--no_logs_print', default=False,
                    action="store_true", help='Set True to not print logs')
parser.add_argument("--data_path", type=str, required=True,
                    help="Generated Sample Path(Folder")


def inception_score(imgs, cuda=True, batch_size=32, resize=False, splits=1, use_finetuned=True):
    """Computes the inception score of the generated images imgs

    imgs -- Torch dataset of (3xHxW) numpy images normalized in the range [-1, 1]
    cuda -- whether or not to run on GPU
    batch_size -- batch size for feeding into Inception v3
    splits -- number of splits
    """
    N = len(imgs)

    assert batch_size > 0
    assert N > batch_size

    # Set up dtype
    if cuda:
        dtype = torch.cuda.FloatTensor
    else:
        if torch.cuda.is_available():
            print("WARNING: You have a CUDA device, so you should probably set cuda=True")
        dtype = torch.FloatTensor

    # Set up dataloader
    dataloader = torch.utils.data.DataLoader(imgs, batch_size=batch_size)

    inception_model = inception_v3(pretrained=True, transform_input=False).type(dtype)

    inception_model.eval();
    up = nn.Upsample(size=(299, 299), mode='bilinear').type(dtype)

    def get_pred(x):
        if resize:
            x = up(x)
        x = inception_model(x)
        return F.softmax(x).data.cpu().numpy()

    # Get predictions
    preds = np.zeros((N, 1000))

    for i, batch in enumerate(tqdm(dataloader), 0):
        batch = batch.type(dtype)
        batchv = Variable(batch)
        batch_size_i = batch.size()[0]

        preds[i * batch_size:i * batch_size + batch_size_i] = get_pred(batchv)
        if not args.no_logs_print:
            print(f'pred: {preds}')

    # Now compute the mean kl-div
    split_scores = []

    for k in range(splits):
        part = preds[k * (N // splits): (k + 1) * (N // splits), :]
        py = np.mean(part, axis=0)
        scores = []
        for i in range(part.shape[0]):
            pyx = part[i, :]
            scores.append(entropy(pyx, py))
        if not args.no_logs_print:
            print(f'generated: {scores}')
        split_scores.append(np.exp(np.mean(scores)))

    print()

    return np.mean(split_scores), np.std(split_scores)

import sys
import datetime

if __name__ == '__main__':
    now = datetime.datetime.now()

    print('-' * 30)
    print(now)
    print('-' * 30)

    args = parser.parse_args()


    class VGGDataset(torch.utils.data.Dataset):
        def __init__(self, path, img_size=256):
            super().__init__()
            self.files = glob.glob(path + '/**/*.jpg', recursive=True)
            self.files.extend(glob.glob(path + '/**/*.png', recursive=True))
            self.files.sort()
            self.img_size = img_size
            self.transform = transforms.Compose([
                transforms.Resize((img_size, img_size)),
                transforms.ToTensor(),
                transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
            ])

        def __getitem__(self, index):
            file = self.files[index]
            image = Image.open(file).convert('RGB')
            x = self.transform(image)
            return x

        def __len__(self):
            return len(self.files)


    import torchvision.datasets as dset
    import torchvision.transforms as transforms

    ds = VGGDataset(path=args.data_path, img_size=512)

    sys.stdout = open(f'{str(datetime.datetime.now()).replace(":", "_")[:19]}_IS.txt', 'w')  # 상단에 코드 배치
    print("Calculating Inception Score...")
    print('inception_score: ', inception_score(ds, cuda=True, batch_size=32, resize=True, splits=1))
    sys.stdout.close()
