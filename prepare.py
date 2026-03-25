"""
Convert a sample .npy file into samples.json and copy images into images/.

Usage:
  python prepare.py                                          # default
  python prepare.py --sample ../create_mnist_sample/sample_logreg_stratified_n2000.npy \
                    --images-dir ../create_mnist_sample/output_stratified
"""

import argparse
import json
import os
import shutil
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument("--sample",
                    default="../create_mnist_sample/sample_logreg_random_n2000.npy")
parser.add_argument("--images-dir",
                    default="../create_mnist_sample/output_random")
args = parser.parse_args()

data = np.load(args.sample, allow_pickle=True).item()
indices = data["index"]
labels = data["true_label"]

# Build samples.json — only index and the class directory (for image path)
samples = []
for i in range(len(indices)):
    idx = int(indices[i])
    cls = int(labels[i])
    samples.append({"index": idx, "class_dir": f"class_{cls}"})

with open("samples.json", "w") as f:
    json.dump(samples, f)
print(f"Wrote samples.json ({len(samples)} entries)")

# Copy images
if os.path.exists("images"):
    shutil.rmtree("images")

copied = 0
for s in samples:
    cls_dir = s["class_dir"]
    idx = s["index"]
    src = os.path.join(args.images_dir, cls_dir, f"{idx}.png")
    dst_dir = os.path.join("images", cls_dir)
    os.makedirs(dst_dir, exist_ok=True)
    shutil.copy2(src, os.path.join(dst_dir, f"{idx}.png"))
    copied += 1

print(f"Copied {copied} images into images/")
