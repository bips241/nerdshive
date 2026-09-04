#!/usr/bin/env bash
set -e

# ==============================================================================
# NerdShive Turnkey Deployment Script for Oracle Cloud Always Free (Ampere A1)
# ==============================================================================

echo "============================================================"
echo "🚀 NerdShive Oracle Cloud Always Free Auto-Deployer"
echo "Targeting Ampere A1 (4 ARM Cores, 24 GB RAM, 4 Gbps Network)"
echo "============================================================"

# 1. Detect Architecture
ARCH=$(uname -m)
echo "[INFO] Detected System Architecture: $ARCH"
if [ "$ARCH" != "aarch64" ] && [ "$ARCH" != "arm64" ] && [ "$ARCH" != "x86_64" ]; then
  echo "[WARN] Untested architecture: $ARCH. Proceeding with standard container runtimes..."
fi

# 2. Check Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[SETUP] Installing Docker engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm get-docker.sh
    echo "[SETUP] Docker installed successfully."
fi

# 3. Kernel Tuning for 100,000+ Concurrent WebSockets
echo "[OPTIMIZE] Tuning Linux kernel networking for high-concurrency WebSockets..."
sudo sysctl -w net.core.somaxconn=65535 || true
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535 || true
sudo sysctl -w fs.file-max=2097152 || true

# Persist sysctl parameters
if ! grep -q "net.core.somaxconn=65535" /etc/sysctl.conf 2>/dev/null; then
    echo "net.core.somaxconn=65535" | sudo tee -a /etc/sysctl.conf
    echo "net.ipv4.tcp_max_syn_backlog=65535" | sudo tee -a /etc/sysctl.conf
    echo "fs.file-max=2097152" | sudo tee -a /etc/sysctl.conf
fi

# 4. Configure OS Firewall (iptables / ufw) for Web, Signaling & WebRTC
echo "[FIREWALL] Ensuring ports 80, 443, 3000, 10000 (TCP) and WebRTC (UDP) are open..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp || true
    sudo ufw allow 443/tcp || true
    sudo ufw allow 3000/tcp || true
    sudo ufw allow 10000/tcp || true
    sudo ufw allow 50000:60000/udp || true
    echo "[FIREWALL] UFW rules configured."
elif command -v iptables &> /dev/null; then
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT || true
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 10000 -j ACCEPT || true
    sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 50000:60000 -j ACCEPT || true
fi

# 5. Build and Launch Containers
echo "[DEPLOY] Launching NerdShive production container stack..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

echo "============================================================"
echo "✅ NERDSHIVE CLUSTER DEPLOYED SUCCESSFULLY!"
echo "============================================================"
echo "🌐 Web Application:       http://$(curl -s ifconfig.me || echo 'YOUR_PUBLIC_IP'):3000"
echo "⚡ Realtime Gateway:      http://$(curl -s ifconfig.me || echo 'YOUR_PUBLIC_IP'):10000"
echo "💾 Redis Pub/Sub:         Port 6379 (In-Memory Engine)"
echo "🗄️  MongoDB Persistence:   Port 27017 (Data Volume: mongo_data)"
echo "============================================================"
echo "To monitor container logs: docker compose -f docker-compose.prod.yml logs -f"
echo "To stop cluster:           docker compose -f docker-compose.prod.yml down"
echo "============================================================"
