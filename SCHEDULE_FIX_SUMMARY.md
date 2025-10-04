# Schedule Not Working - Issue Fixed

## Problem Summary
The schedule system was not triggering ESP32 switches even though the schedule was executing. The ESP32 was not receiving any commands.

## Root Cause
The schedules were referencing **old switch IDs** that no longer existed in the device. This happened when:
1. A device's switches were updated or reconfigured
2. The device was deleted and recreated
3. Switches were modified through the UI

When the schedule service tried to find switches by their IDs, it failed silently and returned early without sending any MQTT commands to the ESP32.

## Example of the Issue

### Schedule References (OLD - Invalid):
```
Switch ID: 68dfe492be9027ca59474118
Switch ID: 68dfe492be9027ca59474119
...
```

### Actual Device Switches (NEW - Current):
```
Switch ID: 68dffe5ff3f5fa7e8d24e3ea (Light1, GPIO 16)
Switch ID: 68dffe5ff3f5fa7e8d24e3eb (light2, GPIO 17)
...
```

The IDs didn't match, so the schedule couldn't find the switches!

## Solution Applied

### 1. Fixed Schedule References
✅ Ran `fix_schedule_switches.cjs` script to update all schedules with correct switch IDs:
- Schedule "CWEEWWE" - Updated 6 switch references
- Schedule "asdvadv" - Updated 6 switch references

### 2. Improved Error Logging
✅ Enhanced `scheduleService.js` with better diagnostic logging:
```javascript
// Now logs when devices or switches are not found
console.error(`[SCHEDULE] Device not found: ${switchRef.deviceId}`);
console.error(`[SCHEDULE] Switch not found in device ${device.name}: switchId=${switchRef.switchId}`);
console.error(`[SCHEDULE] Available switch IDs: ...`);
```

✅ Added detailed hardware dispatch logging:
```javascript
console.log(`[SCHEDULE] Switch ${switch_.name}: gpio=${gpio}, desiredState=${desiredState}`);
console.log(`[SCHEDULE] Hardware dispatch result:`, hw);
```

## How to Test

### 1. Check Current Schedule Status
```bash
mongosh autovolt --eval "db.schedules.find({ enabled: true }, { name: 1, time: 1, action: 1, 'switches.switchId': 1 })"
```

### 2. Verify Device Switches
```bash
mongosh autovolt --eval "db.devices.findOne({ macAddress: '6cc8404f82c0' }, { name: 1, 'switches._id': 1, 'switches.name': 1, 'switches.gpio': 1 })"
```

### 3. Monitor Backend Logs (when schedule runs)
```bash
tail -f /tmp/backend.log | grep SCHEDULE
```

You should see:
```
Executing schedule: CWEEWWE
[SCHEDULE] Switch Light1: gpio=16, desiredState=true
[SCHEDULE] Published MQTT switch command for device 6cc8404f82c0: gpio=16, state=true
[SCHEDULE] Hardware dispatch result: { sent: true, reason: 'mqtt_sent' }
```

### 4. Monitor ESP32 Serial Output
The ESP32 should show:
```
[MQTT] Message arrived [esp32/switches]: {"mac":"6c:c8:40:4f:82:c0","secret":"...","gpio":16,"state":true}
[MQTT] Processed command for this device: GPIO 16 -> ON
[CMD] Queued command: GPIO 16 -> ON
[CMD] Relay GPIO 16 set to ON (from queue)
```

## Verification Checklist

- [x] Schedules updated with correct switch IDs
- [x] Enhanced logging added to schedule service
- [x] Backend server restarted with new code
- [ ] Test schedule execution when it triggers
- [ ] Verify ESP32 receives MQTT commands
- [ ] Verify switches physically turn on/off

## Next Steps

1. **Wait for the next scheduled time** (e.g., 20:52 for "CWEEWWE")
2. **Watch the backend logs** for schedule execution
3. **Watch the ESP32 serial monitor** for incoming MQTT commands
4. **Verify physical switches** respond correctly

## If Issues Persist

### Check MQTT Connection
```bash
# Check if ESP32 is connected to MQTT broker
tail -f /tmp/backend.log | grep MQTT
```

### Manual Test MQTT Command
```bash
# Send a test command directly to ESP32
mosquitto_pub -h 192.168.0.108 -t "esp32/switches" -m '{"mac":"6c:c8:40:4f:82:c0","secret":"YOUR_SECRET","gpio":16,"state":true}'
```

### Verify ESP32 Config
Make sure your ESP32 `config.h` has:
- Correct WiFi credentials
- Correct MQTT broker IP (192.168.0.108)
- Correct device secret
- Correct GPIO pin mappings

## Prevention

To prevent this issue in the future:

1. **Don't delete and recreate devices** - Use "Edit Device" instead
2. **Be careful when modifying switches** - Existing schedules reference switch IDs
3. **Check schedules after device updates** - Run the fix script if needed:
   ```bash
   cd /Users/chandu/Documents/github/new-autovolt
   node fix_schedule_switches.cjs
   ```

## Files Modified

1. `/backend/services/scheduleService.js` - Added error logging
2. `/fix_schedule_switches.cjs` - Script to fix invalid switch references
3. Database: Updated all schedules with correct switch IDs

---
**Status**: ✅ **FIXED** - Schedules should now trigger ESP32 switches correctly
**Date**: October 4, 2025
**Next Test**: Wait for scheduled time to verify
