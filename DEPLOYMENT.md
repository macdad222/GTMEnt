# Deployment Guide

This guide covers deploying the Enterprise Strategy Platform to a production server.

## Prerequisites

- Linux/macOS server (Mac Mini, Ubuntu, etc.)
- Docker & Docker Compose installed
- 4GB+ RAM
- Cloudflare account (for tunnel access)
- xAI API key for LLM features

## Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/GTMEnt.git
cd GTMEnt
```

### 2. Build the Container

```bash
docker-compose build
```

### 3. Data Migration (from Development)

If migrating from a development machine with existing data:

**On Development Machine:**
```bash
# Export the Docker volume
docker run --rm \
  -v gtment_gtm-app-data:/data \
  -v $(pwd):/backup \
  alpine tar cvf /backup/gtm-data-backup.tar /data

# Transfer to production server
scp gtm-data-backup.tar user@production-server:/path/to/GTMEnt/
```

**On Production Server:**
```bash
# Create the volume
docker volume create gtment_gtm-app-data

# Import the data
docker run --rm \
  -v gtment_gtm-app-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xvf /backup/gtm-data-backup.tar --strip 1"
```

### 4. Start the Application

```bash
docker-compose up -d
```

Verify it's running:
```bash
docker logs -f gtm-enterprise-platform
curl http://localhost:3700/api/admin/health
```

### 5. Configure Cloudflare Tunnel

#### Install cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Ubuntu/Debian
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

#### Create and Configure Tunnel

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create gtm-enterprise

# Configure tunnel (creates ~/.cloudflared/config.yml)
cat > ~/.cloudflared/config.yml << EOF
tunnel: gtm-enterprise
credentials-file: /Users/YOUR_USER/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: gtm.cmaclab.com
    service: http://localhost:3700
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns gtm-enterprise gtm.cmaclab.com

# Run tunnel (foreground for testing)
cloudflared tunnel run gtm-enterprise

# Or run as a service
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

### 6. Cloudflare Dashboard Settings

1. Go to Cloudflare Dashboard → SSL/TLS
2. Set encryption mode to **Full** (not Flexible)
3. Enable **HTTP/2** under Speed → Optimization

### 7. Verify Deployment

1. Navigate to `https://gtm.cmaclab.com`
2. Login with `admin` / `admin`
3. Change password when prompted
4. Configure LLM API key in Settings

## Updating the Application

```bash
cd /path/to/GTMEnt
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

## Backup & Restore

### Automated Backups

Create a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * docker run --rm -v gtment_gtm-app-data:/data -v /backups:/backup alpine tar cvf /backup/gtm-backup-$(date +\%Y\%m\%d).tar /data
```

### Manual Backup

```bash
docker run --rm \
  -v gtment_gtm-app-data:/data \
  -v $(pwd):/backup \
  alpine tar cvf /backup/gtm-backup-$(date +%Y%m%d).tar /data
```

### Restore from Backup

```bash
docker-compose down
docker run --rm \
  -v gtment_gtm-app-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "rm -rf /data/* && cd /data && tar xvf /backup/gtm-backup-YYYYMMDD.tar --strip 1"
docker-compose up -d
```

## Monitoring

### View Logs

```bash
# Follow logs
docker logs -f gtm-enterprise-platform

# Last 100 lines
docker logs --tail 100 gtm-enterprise-platform
```

### Health Check

```bash
curl https://gtm.cmaclab.com/api/admin/health
```

### Resource Usage

```bash
docker stats gtm-enterprise-platform
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs gtm-enterprise-platform

# Check if port is in use
lsof -i :3700

# Rebuild without cache
docker-compose build --no-cache
```

### Cloudflare Tunnel Issues

```bash
# Check tunnel status
cloudflared tunnel info gtm-enterprise

# Restart tunnel
sudo launchctl stop com.cloudflare.cloudflared
sudo launchctl start com.cloudflare.cloudflared

# Check logs
tail -f /var/log/cloudflared.log
```

### WebSocket (Voice AI) Not Working

1. Ensure Cloudflare tunnel supports WebSockets (it does by default)
2. Check browser console for errors
3. Verify Grok API key is configured

### Data Volume Issues

```bash
# Check volume
docker volume inspect gtment_gtm-app-data

# List files in volume
docker run --rm -v gtment_gtm-app-data:/data alpine ls -la /data
```

## Security Considerations

1. **Change default password** immediately after first login
2. **Restrict tunnel access** using Cloudflare Access if needed
3. **Keep API keys secure** - they're stored in the data volume
4. **Regular backups** - data includes all LLM analyses
5. **Monitor access logs** via Cloudflare dashboard

## Architecture Notes

```
[Browser] 
    ↓ HTTPS
[Cloudflare CDN]
    ↓ Tunnel
[cloudflared on Mac Mini]
    ↓ HTTP localhost:3700
[Docker Container: gtm-enterprise-platform]
    ├── FastAPI Backend (uvicorn)
    ├── React Frontend (static)
    ├── WebSocket Proxy (Voice AI)
    └── Data Volume (/app/data)
```

