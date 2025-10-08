# Raspberry Pi PiSignage Setup Guide

This guide will help you set up a Raspberry Pi with PiSignage for digital signage integration with your AutoVolt system.

## 📋 Prerequisites

- Raspberry Pi 3B+ or newer (Raspberry Pi 4 recommended)
- MicroSD card (32GB minimum)
- Power supply (5V, 3A minimum)
- HDMI display/monitor
- Internet connection (Ethernet or WiFi)

## 🚀 Step 1: Install Raspberry Pi OS

1. **Download Raspberry Pi Imager** from [raspberrypi.com/software](https://www.raspberrypi.com/software/)

2. **Install Raspberry Pi OS Lite** (64-bit):
   - Open Raspberry Pi Imager
   - Choose OS → Raspberry Pi OS (other) → Raspberry Pi OS Lite (64-bit)
   - Select your microSD card
   - Click "Write"

3. **Enable SSH** (optional, for headless setup):
   - Create an empty file named `ssh` in the boot partition of the SD card

## 📦 Step 2: Install PiSignage

### Option A: Using PiSignage Installer (Recommended)

```bash
# Boot your Raspberry Pi and connect via SSH or terminal
ssh pi@raspberrypi.local  # Default password: raspberry

# Download and run the PiSignage installer
curl -L https://pisignage.com/install | bash
```

### Option B: Manual Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone PiSignage repository
git clone https://github.com/colloqi/pisignage-server.git
cd pisignage-server

# Install dependencies
npm install

# Create data directory
sudo mkdir -p /home/pi/pisignage-data
sudo chown pi:pi /home/pi/pisignage-data
```

## ⚙️ Step 3: Configure PiSignage

### Basic Configuration

1. **Start PiSignage**:
```bash
# Using PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Or run directly
npm start
```

2. **Access PiSignage Web Interface**:
   - Open browser: `http://raspberrypi.local:3000`
   - Default credentials:
     - Username: `pi`
     - Password: `pi`

3. **Initial Setup**:
   - Change default password
   - Configure network settings
   - Set display resolution

### Advanced Configuration

Create a configuration file `/home/pi/pisignage-data/config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "database": {
    "path": "/home/pi/pisignage-data/db"
  },
  "uploads": {
    "path": "/home/pi/pisignage-data/uploads"
  },
  "groups": {
    "default": "main-display"
  },
  "settings": {
    "autoPlay": true,
    "loop": true,
    "shuffle": false,
    "defaultDuration": 10,
    "transition": "fade",
    "transitionDuration": 1000
  }
}
```

## 🔗 Step 4: Configure AutoVolt Backend

### Update Environment Variables

Edit your `backend/.env` file to include PiSignage settings:

```bash
# PiSignage Configuration
PISIGNAGE_SERVER_URL=http://YOUR_RASPBERRY_PI_IP:3000
PISIGNAGE_USERNAME=pi
PISIGNAGE_PASSWORD=your_pisignage_password
PISIGNAGE_API_KEY=your_api_key_if_used
```

**Replace:**
- `YOUR_RASPBERRY_PI_IP` with your Raspberry Pi's IP address
- `your_pisignage_password` with your PiSignage password
- `your_api_key_if_used` with API key if configured

### Find Raspberry Pi IP Address

```bash
# On Raspberry Pi
hostname -I

# Or from another computer on the same network
ping raspberrypi.local
```

## 🧪 Step 5: Test Integration

### 1. Restart Backend

```bash
cd backend
npm restart
```

### 2. Test PiSignage Connection

Create a test script to verify the connection:

```javascript
// test_pisignage.js
const piSignageService = require('./services/piSignageService');

async function testConnection() {
  try {
    console.log('Testing PiSignage connection...');
    const groups = await piSignageService.getGroups();
    console.log('✅ PiSignage connected successfully!');
    console.log('Available groups:', groups);
  } catch (error) {
    console.error('❌ PiSignage connection failed:', error.message);
  }
}

testConnection();
```

Run the test:
```bash
node test_pisignage.js
```

### 3. Create Test Content

1. **Login to AutoVolt Admin Panel**
2. **Create a Notice**:
   - Title: "Test PiSignage Integration"
   - Content: "This is a test notice for PiSignage display"
   - Content Type: "announcement"
   - Status: "approved"

3. **Assign to Board**:
   - Create or select a board
   - Assign the notice to the board

4. **Check PiSignage Display**:
   - The notice should appear on your Raspberry Pi display
   - Check PiSignage web interface for playlist updates

## 📊 Step 6: Advanced Configuration

### Create Display Groups

```javascript
// Create a group for your main display
const groupData = await piSignageService.createGroup('Main Campus Display', {
  settings: {
    playbackMode: 'priority',
    defaultDuration: 15,
    enableTransitions: true
  }
});
```

### Upload Assets

```javascript
// Upload an image asset
const asset = await piSignageService.uploadAsset('/path/to/image.jpg', 'campus-image.jpg');
console.log('Asset uploaded:', asset);
```

### Create Scheduled Playlists

```javascript
// Create a sequenced playlist
const playlist = await piSignageService.createSequencedPlaylist('Morning Announcements', [
  { type: 'notice', id: 'notice_id_1', duration: 15 },
  { type: 'notice', id: 'notice_id_2', duration: 30 },
  { type: 'asset', id: 'asset_id_1', duration: 10 }
]);
```

## 🔧 Troubleshooting

### Common Issues

1. **Cannot Connect to PiSignage**
   - Check Raspberry Pi IP address
   - Verify PiSignage is running: `sudo systemctl status pisignage`
   - Check firewall settings
   - Ensure correct credentials in `.env`

2. **Content Not Displaying**
   - Verify notice is approved and published
   - Check board assignment
   - Confirm PiSignage group configuration
   - Check Raspberry Pi display connection

3. **Assets Not Uploading**
   - Verify file paths and permissions
   - Check available disk space
   - Confirm PiSignage upload directory exists

### Logs and Debugging

```bash
# Check PiSignage logs
pm2 logs pisignage

# Check backend logs for PiSignage errors
tail -f backend/logs/app.log | grep -i pisignage

# Test network connectivity
curl http://YOUR_RASPBERRY_PI_IP:3000/api/groups
```

## 📈 Monitoring and Maintenance

### Auto-start on Boot

```bash
# Enable PM2 auto-start
pm2 startup
pm2 save

# Or create systemd service
sudo nano /etc/systemd/system/pisignage.service
```

### Backup Configuration

```bash
# Backup PiSignage data
tar -czf pisignage-backup-$(date +%Y%m%d).tar.gz /home/pi/pisignage-data/

# Backup AutoVolt PiSignage settings
cp backend/.env backend/.env.backup
```

### Update PiSignage

```bash
# Update PiSignage server
cd pisignage-server
git pull
npm install
pm2 restart pisignage
```

## 🎯 Usage Examples

### Daily Schedule Setup

1. **Morning Announcements** (8:00-9:00):
   - Priority: 1 (Highest)
   - Content: Daily announcements, news

2. **Regular Notices** (9:00-17:00):
   - Priority: 3 (Medium)
   - Content: General notices, events

3. **Emergency Alerts** (Anytime):
   - Priority: 1 (Highest)
   - Content: Emergency notifications

### API Integration

Your AutoVolt system can now automatically:
- Upload notice content to PiSignage
- Create and manage playlists
- Schedule content based on priority and time
- Update displays in real-time

## 📞 Support

For PiSignage-specific issues:
- Documentation: [PiSignage GitHub](https://github.com/colloqi/pisignage-server)
- Community: [PiSignage Forums](https://forum.pisignage.com)

For AutoVolt integration issues:
- Check backend logs
- Verify environment variables
- Test API endpoints manually

---

**Next Steps:**
1. Complete the setup above
2. Test the integration with sample content
3. Configure your display groups and schedules
4. Set up automated content publishing workflows</content>
<parameter name="filePath">c:\Users\IOT\Downloads\aims_smart_class\new-autovolt\RASPBERRY_PI_PISIGNAGE_SETUP.md