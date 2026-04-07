#!/usr/bin/env bash
set -euo pipefail

IMAGE="palodequeso/cards-and-bees"
CONTAINER="cards-and-bees"

usage() {
  echo "Usage: $0 <user@host>"
  echo "  e.g. $0 douglas@192.168.1.50"
  exit 1
}

[[ $# -lt 1 ]] && usage

SSH_TARGET="$1"

echo "==> Building Docker image..."
docker build -t "$IMAGE" .

echo "==> Saving image to tarball..."
docker save "$IMAGE" | gzip > /tmp/cards-and-bees.tar.gz

echo "==> Uploading to $SSH_TARGET..."
scp /tmp/cards-and-bees.tar.gz "$SSH_TARGET":/tmp/cards-and-bees.tar.gz

echo "==> Deploying on remote..."
ssh "$SSH_TARGET" bash -s <<EOF
  set -euo pipefail
  echo "  Loading image..."
  docker load < /tmp/cards-and-bees.tar.gz
  rm /tmp/cards-and-bees.tar.gz

  echo "  Stopping old container..."
  docker stop $CONTAINER 2>/dev/null || true
  docker rm $CONTAINER 2>/dev/null || true

  echo "  Starting new container..."
  docker run -d --name $CONTAINER --restart unless-stopped -p 2567:2567 $IMAGE

  echo "  Done! Container running:"
  docker ps --filter name=$CONTAINER --format "  {{.Names}}  {{.Status}}  {{.Ports}}"
EOF

rm /tmp/cards-and-bees.tar.gz
echo "==> Deploy complete!"
