#!/usr/bin/env bash
# 在本机（有足够内存）构建 linux/amd64 镜像并导出，供 0.5G 服务器 docker load
set -euo pipefail
cd "$(dirname "$0")"

PLATFORM="${PLATFORM:-linux/amd64}"
TAG="${TAG:-flowai-api:latest}"
OUT="${OUT:-flowai-api.tar.gz}"

echo "Building $TAG ($PLATFORM)..."
docker buildx build --platform "$PLATFORM" -t "$TAG" --load .

echo "Saving to $OUT..."
docker save "$TAG" | gzip > "$OUT"
ls -lh "$OUT"
echo "Done. Upload with:"
echo "  scp $OUT root@8.219.243.236:~/flowai/"
