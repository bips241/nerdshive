#!/usr/bin/env bash
set -e

# ==============================================================================
# NerdShive Turnkey Deployment Script for Oracle Cloud Always Free (Ampere A1 / AMD)
# ==============================================================================

echo "============================================================"
echo "🚀 NerdShive Oracle Cloud Always Free Production Deployer"
echo "Targeting Ampere A1 (Up to 4 ARM Cores, 24 GB RAM, 4 Gbps Network)"
echo "============================================================"

# 1. Detect Architecture
ARCH=$(uname -m)
echo "[INFO] Detected System Architecture: $ARCH"
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  echo "[INFO] Architecture: ARM64 (Ampere A1 Cloud Native Compute)"
elif [ "$ARCH" = "x86_64" ]; then
  echo "[INFO] Architecture: x86_64 (AMD Compute)"
fi

# 2. Update Apt & Install Base Tools
sudo apt-get update -y
sudo apt-get install -y curl git ufw iptables-persistent netfilter-persistent

# 3. Check / Install Docker Engine & Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "[SETUP] Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm get-docker.sh
    echo "[SETUP] Docker installed successfully."
fi

# 4. Kernel Network Tuning for 100,000+ Concurrent WebSockets
echo "[OPTIMIZE] Tuning Linux kernel networking for high-concurrency WebSockets..."
sudo sysctl -w net.core.somaxconn=65535 || true
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535 || true
sudo sysctl -w fs.file-max=2097152 || true

if ! grep -q "net.core.somaxconn=65535" /etc/sysctl.conf 2>/dev/null; then
    echo "net.core.somaxconn=65535" | sudo tee -a /etc/sysctl.conf
    echo "net.ipv4.tcp_max_syn_backlog=65535" | sudo tee -a /etc/sysctl.conf
    echo "fs.file-max=2097152" | sudo tee -a /etc/sysctl.conf
fi

# 5. Configure Host Firewall (Crucial for Oracle Cloud Ubuntu Images)
echo "[FIREWALL] Configuring OS firewall for Ports 80 (HTTP), 443 (HTTPS), and WebRTC..."
# Oracle Cloud Ubuntu images enforce strict iptables REJECT rules by default
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT || true
sudo iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT || true
sudo iptables -I INPUT 1 -p tcp --dport 10000 -j ACCEPT || true
sudo iptables -I INPUT 1 -p udp --dport 50000:60000 -j ACCEPT || true

# Persist iptables across reboots
sudo netfilter-persistent save || true

# Also configure UFW if active
if sudo ufw status | grep -q "active"; then
    sudo ufw allow 80/tcp || true
    sudo ufw allow 443/tcp || true
    sudo ufw allow 3000/tcp || true
    sudo ufw allow 10000/tcp || true
    sudo ufw allow 50000:60000/udp || true
fi

# 6. Launch Production Container Stack
echo "[DEPLOY] Launching NerdShive production container stack via Docker Compose..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

PUBLIC_IP=$(curl -s ifconfig.me || echo "YOUR_ORACLE_PUBLIC_IP")

echo "============================================================"
echo "✅ NERDSHIVE PRODUCTION CLUSTER DEPLOYED SUCCESSFULLY!"
echo "============================================================"
echo "🌐 Edge Reverse Proxy (Nginx):  http://${PUBLIC_IP} (Port 80 / 443)"
echo "⚡ Realtime Signaling & Sockets: http://${PUBLIC_IP}/socket.io/"
echo "📱 Next.js Web Application:      http://${PUBLIC_IP}:3000"
echo "💾 Distributed Redis Engine:    Port 6379"
echo "============================================================"
echo "Next Steps:"
echo "1. Point your domain (e.g. nerdshive.online) to ${PUBLIC_IP} in Cloudflare DNS."
echo "2. Enable Cloudflare Proxy (Orange Cloud) for automatic SSL and Edge CDN caching."
echo "3. Monitor logs: docker compose -f docker-compose.prod.yml logs -f"
echo "============================================================"
