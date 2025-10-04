# ESP32 Connectivity Troubleshooting Guide

## Problem: ESP32 Devices Going Offline

ESP32 devices in your AIMS Smart Class system may appear offline even when powered on. This guide helps diagnose and fix connectivity issues.

## Quick Diagnosis

Run the diagnostic script:
```powershell
.\esp32_diagnostic.ps1
```

## Common Issues & Solutions

### 1. Power Supply Problems
**Symptoms:** ESP32 frequently disconnects, status LED flickers
**Solutions:**
- Use a stable 5V/1A power supply
- Check voltage with multimeter (should be 4.8-5.2V)
- Replace power adapter if unstable
- Check for loose power connections

### 2. WiFi Connectivity Issues
**Symptoms:** ESP32 connects but goes offline, status LED fast-blinks
**Solutions:**
- Move ESP32 closer to WiFi router
- Check WiFi signal strength (should be > -70 dBm)
- Verify WiFi credentials in `config.h`
- Check router for MAC address filtering
- Try different WiFi channels (avoid interference)

### 3. MQTT Connection Problems
**Symptoms:** WiFi connected but MQTT fails, status LED slow-blinks
**Solutions:**
- Verify MQTT broker IP in `config.h` (currently `172.16.3.171`)
- Check firewall settings (port 1883 must be open)
- Ensure MQTT broker is running on backend server
- Check for network segmentation issues

### 4. Network Configuration Issues
**Symptoms:** ESP32 gets IP but can't communicate
**Solutions:**
- Check router DHCP settings
- Verify DNS configuration
- Test network connectivity with diagnostic script
- Check for VLAN/subnet issues

### 5. ESP32 Hardware/Software Issues
**Symptoms:** Random disconnects, crashes
**Solutions:**
- Monitor ESP32 temperature (should be <60°C)
- Check for memory leaks in serial output
- Update ESP32 firmware if needed
- Check for GPIO pin conflicts

## Status LED Indicators

- **Fast Blink (250ms on/off):** WiFi disconnected
- **Slow Blink (1s on/off):** WiFi OK, MQTT disconnected
- **Solid ON:** Fully connected (WiFi + MQTT)

## Monitoring Tools

### Backend Server Logs
Check for MQTT connection messages:
```bash
# View recent MQTT activity
tail -f /var/log/your-app.log | grep MQTT
```

### ESP32 Serial Monitoring
Connect ESP32 to computer and monitor serial output:
```bash
# Use Arduino IDE Serial Monitor at 115200 baud
# Or use screen/minicom
screen /dev/ttyUSB0 115200
```

### Network Monitoring
```bash
# Check MQTT connections
netstat -ano | findstr ":1883"

# Monitor ESP32 IP addresses
arp -a | findstr "172.16.3"
```

## Advanced Troubleshooting

### 1. ESP32 Serial Debug Output
The improved ESP32 code now provides detailed debug information:
- WiFi connection attempts and status
- MQTT connection attempts and error codes
- Heartbeat transmission status
- Memory usage and system health

### 2. Backend MQTT Monitoring
The backend logs MQTT events:
- Client connections/disconnections
- Message publishing/subscribing
- Connection errors

### 3. Network Packet Analysis
Use Wireshark to capture MQTT traffic:
- Filter for `tcp.port == 1883`
- Look for connection attempts and failures
- Check for firewall blocking

### 4. Power Quality Testing
- Use oscilloscope to check power supply stability
- Monitor voltage during ESP32 operation
- Check for electrical noise/interference

## Configuration Files

### ESP32 Config (`config.h`)
```cpp
#define WIFI_SSID "AIMS-WIFI"
#define WIFI_PASSWORD "Aimswifi#2025"
// #define MQTT_BROKER "172.16.3.171"
#define MQTT_PORT 1883
```

### Backend Environment (`.env`)
```
MQTT_BROKER=172.16.3.171
MQTT_PORT=1883
```

## Preventive Measures

1. **Power Quality:**
   - Use regulated power supplies
   - Add capacitors for voltage stabilization
   - Monitor power consumption

2. **Network Stability:**
   - Use wired Ethernet where possible
   - Implement WiFi mesh networks
   - Regular router firmware updates

3. **Monitoring:**
   - Set up automated health checks
   - Monitor ESP32 heartbeat messages
   - Log all connection events

4. **Redundancy:**
   - Multiple MQTT brokers
   - Backup power supplies
   - Alternative network paths

## Emergency Recovery

If ESP32 becomes completely unresponsive:

1. **Hard Reset:**
   - Power off ESP32 for 30 seconds
   - Power on and monitor serial output
   - Check for boot errors

2. **Firmware Re-flash:**
   - Re-upload ESP32 firmware via Arduino IDE
   - Verify all configurations
   - Test basic functionality

3. **Network Reset:**
   - Forget WiFi network on ESP32
   - Reconnect with correct credentials
   - Verify MQTT broker accessibility

## Support Information

When reporting issues, include:
- ESP32 serial debug output
- Backend server logs
- Network diagnostic results
- Power supply specifications
- ESP32 firmware version
- Router configuration details

## Recent Improvements

The ESP32 code has been updated with:
- Better WiFi reconnection logic
- Improved MQTT error handling
- Enhanced heartbeat monitoring
- Detailed debug logging
- Connection quality monitoring