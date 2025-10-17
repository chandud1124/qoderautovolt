# Network Access Configuration Guide

## 📡 Accessing Grafana & Prometheus from Different Users

### Server Details
- **Server IP Address**: 172.16.3.171
- **Grafana Port**: 3000
- **Prometheus Port**: 9090
- **Backend API Port**: 3001

---

## 🌐 Access URLs for Different Users

### From ANY Device on the Same Network:

1. **Grafana Dashboard**
   - URL: `http://172.16.3.171:3000`
   - Default Login: `admin` / `admin`
   
2. **Prometheus Metrics**
   - URL: `http://172.16.3.171:9090`
   - No login required

3. **AutoVolt Application**
   - URL: `http://172.16.3.171:5173` (or your frontend port)

---

## ⚙️ Configuration Steps

### Step 1: Update Environment Variables ✅ (Already Done)
The `.env.local` file has been updated with network-accessible URLs:
```bash
VITE_GRAFANA_URL=http://172.16.3.171:3000
VITE_PROMETHEUS_URL=http://172.16.3.171:9090
```

### Step 2: Start the Monitoring Stack
Run this command to start Grafana and Prometheus:
```powershell
docker-compose -f docker-compose.monitoring.yml up -d
```

### Step 3: Configure Windows Firewall (If Access is Blocked)
Run these commands in PowerShell as Administrator:

```powershell
# Allow Grafana port
New-NetFirewallRule -DisplayName "Grafana" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow Prometheus port
New-NetFirewallRule -DisplayName "Prometheus" -Direction Inbound -LocalPort 9090 -Protocol TCP -Action Allow

# Allow Backend API port
New-NetFirewallRule -DisplayName "AutoVolt Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Allow Frontend port (if needed)
New-NetFirewallRule -DisplayName "AutoVolt Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### Step 4: Rebuild Frontend with New Configuration
```powershell
npm run build
```

---

## 👥 For Users on Other Devices

### Desktop/Laptop Users:
1. Open browser (Chrome, Firefox, Edge)
2. Navigate to:
   - Grafana: `http://172.16.3.171:3000`
   - Prometheus: `http://172.16.3.171:9090`
   - AutoVolt App: `http://172.16.3.171:5173`

### Mobile Users:
1. Connect to same WiFi network as server
2. Open mobile browser
3. Use the same URLs above

---

## 🔒 Security Recommendations

1. **Change Default Grafana Password**
   - Login with `admin`/`admin`
   - You'll be prompted to change password on first login

2. **Configure Grafana Authentication**
   - Go to Configuration → Users → Add user
   - Set up proper user accounts

3. **Network Security**
   - Only allow access from trusted networks
   - Consider setting up VPN for remote access
   - Use HTTPS in production (requires SSL certificates)

---

## 🔍 Troubleshooting

### If Users Cannot Access:

1. **Check Server is Running**
   ```powershell
   # Check if services are running
   docker ps
   ```

2. **Test from Server**
   ```powershell
   # Test Grafana
   curl http://localhost:3000
   
   # Test Prometheus
   curl http://localhost:9090
   ```

3. **Check Firewall**
   ```powershell
   # List firewall rules
   Get-NetFirewallRule -DisplayName "*Grafana*"
   Get-NetFirewallRule -DisplayName "*Prometheus*"
   ```

4. **Verify IP Address**
   ```powershell
   ipconfig | findstr "IPv4"
   ```

5. **Check Docker Containers**
   ```powershell
   docker logs grafana
   docker logs prometheus
   ```

---

## 🌍 Using Hostname Instead of IP

If your network has DNS configured, you can use hostname:
```bash
# Replace IP with hostname
VITE_GRAFANA_URL=http://YOUR-PC-NAME:3000
VITE_PROMETHEUS_URL=http://YOUR-PC-NAME:9090
```

To find your hostname:
```powershell
hostname
```

---

## 📱 Quick Reference Card

### For Network Users:
```
Server: 172.16.3.171

Services:
├─ Grafana:    http://172.16.3.171:3000
├─ Prometheus: http://172.16.3.171:9090
├─ API:        http://172.16.3.171:3001
└─ Frontend:   http://172.16.3.171:5173

Grafana Login: admin/admin (change on first login)
```

---

## ✅ Verification Checklist

- [ ] `.env.local` updated with server IP
- [ ] Docker monitoring stack started
- [ ] Firewall rules configured
- [ ] Frontend rebuilt
- [ ] Tested from another device
- [ ] Grafana password changed from default

---

## 📞 Support

If you encounter issues:
1. Check server logs: `docker logs grafana` and `docker logs prometheus`
2. Verify network connectivity: `ping 172.16.3.171`
3. Check port availability: `netstat -an | findstr "3000 9090"`

---

**Last Updated**: October 17, 2025
**Server IP**: 172.16.3.171
**Configuration Status**: ✅ Network-accessible
