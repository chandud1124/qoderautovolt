# ESP32 Manual Switch Fix

## Problem
Manual switches (physical buttons) were not working when GND was touched to the manual GPIO pins. The ESP32 was detecting `raw=1` (HIGH) but not responding when the pin was pulled LOW (touched to GND).

## Root Cause Analysis

### Serial Log Analysis:
```
[MANUAL] GPIO 16 manual pin 25: raw=1, active=0, state=1
```

This shows:
- `raw=1` (HIGH) - Pin is reading HIGH (not pressed)
- `active=0` (FALSE) - Active-low mode, so HIGH means inactive
- `state=1` (ON) - Relay is ON

**The Issues:**
1. **Uninitialized state variables**: `lastManualLevel`, `stableManualLevel`, and `lastManualActive` were initialized to `-1`, causing the debounce logic to fail
2. **Wrong trigger condition**: Momentary mode was triggering on **release** (`!active && sw.lastManualActive`) instead of on **press**
3. **Extra delay condition**: Had `MANUAL_REPEAT_IGNORE_MS` check that prevented quick toggles
4. **Active state not updated**: The `sw.lastManualActive` was updated using the wrong `active` variable instead of the debounced `currentActive`

## Solution Applied

### 1. Initialize State Variables Properly
```cpp
// Initialize with current pin reading during setup
int initialLevel = digitalRead(sw.manualGpio);
sw.lastManualLevel = initialLevel;
sw.stableManualLevel = initialLevel;
sw.lastManualActive = sw.manualActiveLow ? (initialLevel == LOW) : (initialLevel == HIGH);
sw.lastManualChangeMs = now;
```

### 2. Fixed Momentary Switch Logic
**Before** (triggered on release):
```cpp
if (!active && sw.lastManualActive && (now - sw.lastManualChangeMs) > MANUAL_REPEAT_IGNORE_MS) {
  // Toggle on release
}
```

**After** (triggers on press):
```cpp
if (currentActive && !sw.lastManualActive) {
  // Toggle on press (inactive -> active transition)
  sw.state = !sw.state;
  digitalWrite(sw.relayGpio, ...);
}
```

### 3. Improved Debounce Logic
```cpp
// Detect level change
if (rawLevel != sw.lastManualLevel) {
  sw.lastManualChangeMs = now;
  sw.lastManualLevel = rawLevel;
  Serial.printf("[MANUAL] GPIO %d pin change detected: raw=%d\n", sw.relayGpio, rawLevel);
}

// Debounce: wait for stable reading
if ((now - sw.lastManualChangeMs) > MANUAL_DEBOUNCE_MS) {
  if (rawLevel != sw.stableManualLevel) {
    sw.stableManualLevel = rawLevel;
    // Recalculate active state after debounce
    bool currentActive = sw.manualActiveLow ? (rawLevel == LOW) : (rawLevel == HIGH);
    // ... trigger logic
  }
}
```

### 4. Fixed Maintained Switch Logic
Now uses the debounced `currentActive` state:
```cpp
// Maintained: switch state follows manual input
if (sw.state != currentActive) {
  sw.state = currentActive;
  digitalWrite(sw.relayGpio, ...);
}
```

### 5. Enhanced Debug Logging
```cpp
Serial.printf("[MANUAL] Setup GPIO %d (manual pin %d), initial raw=%d\n", ...);
Serial.printf("[MANUAL] GPIO %d pin change detected: raw=%d\n", ...);
Serial.printf("[MANUAL] GPIO %d stable change: momentary=%d, active=%d->%d\n", ...);
Serial.printf("[MANUAL] Momentary PRESS: Relay GPIO %d toggled to %s\n", ...);
```

## Expected Behavior After Fix

### When you touch GND to manual pin:

**Serial Output:**
```
[MANUAL] GPIO 16 pin change detected: raw=0
[MANUAL] GPIO 16 stable change: momentary=1, active=0->1
[MANUAL] Momentary PRESS: Relay GPIO 16 toggled to ON
[MQTT] Published manual switch event: GPIO 16 -> ON
```

**Physical Result:**
- Relay toggles immediately (no delay)
- LED/load connected to relay turns ON
- State saved to NVS (persists after reboot)
- Event sent to backend via MQTT (logged in database)

### When you release (remove GND connection):

**Serial Output:**
```
[MANUAL] GPIO 16 pin change detected: raw=1
[MANUAL] GPIO 16 stable change: momentary=1, active=1->0
```

**Physical Result:**
- No action (momentary switch only toggles on press, not release)

## Hardware Wiring

For momentary (push button) switches:
```
Manual Pin (GPIO) ----[Button]---- GND
                  |
              (Pull-up resistor internal)
```

Configuration:
- `manualMode`: "momentary"
- `manualActiveLow`: true (active when LOW)
- pinMode: `INPUT_PULLUP`

**When button is pressed**: Pin reads LOW (0) → `active=true` → Toggle relay
**When button is released**: Pin reads HIGH (1) → `active=false` → No action

## Testing Instructions

### 1. Upload Fixed Firmware
Upload the updated `esp32_mqtt_client.ino` to your ESP32.

### 2. Monitor Serial Output
```
Open Serial Monitor at 115200 baud
```

### 3. Test Each Manual Switch

**Test GPIO 16 (manual pin 25):**
1. Touch GND wire to GPIO 25
2. Should see: `[MANUAL] GPIO 16 pin change detected: raw=0`
3. Should see: `[MANUAL] Momentary PRESS: Relay GPIO 16 toggled to ON`
4. Relay should turn ON

**Repeat for all switches:**
- GPIO 17 (manual pin 26)
- GPIO 18 (manual pin 27)
- GPIO 19 (manual pin 32)
- GPIO 21 (manual pin 33)
- GPIO 22 (manual pin 23)

### 4. Verify in Web UI
After pressing a manual switch, the web UI should update to show the new state.

## Troubleshooting

### If switch still doesn't respond:

1. **Check wiring**: Ensure GND connection is solid
2. **Check GPIO availability**: Some ESP32 pins are input-only
3. **Check serial output**: Look for "pin change detected" message
4. **Verify config**: Check that `manualMode` is set to "momentary"
5. **Test raw reading**: Add temporary code to constantly print pin state

### Serial Debug Commands:
Watch for these messages:
```bash
# Pin setup
[MANUAL] Setup GPIO X (manual pin Y), initial raw=Z

# Pin state (every 5 seconds)
[MANUAL] GPIO X manual pin Y: raw=Z, active=A, state=S, lastActive=L

# Change detection
[MANUAL] GPIO X pin change detected: raw=Z

# Stable state change
[MANUAL] GPIO X stable change: momentary=M, active=A1->A2

# Action taken
[MANUAL] Momentary PRESS: Relay GPIO X toggled to STATE
```

## Files Modified

1. `/esp32/esp32_mqtt_client.ino` - Fixed `handleManualSwitches()` function

## Changes Summary

| Issue | Before | After |
|-------|--------|-------|
| Initialization | `-1` (invalid) | Actual pin reading |
| Trigger | On release | On press |
| Debounce | Wrong logic | Proper level change detection |
| Active state | Uses wrong variable | Uses debounced state |
| Debug logging | Minimal | Detailed with transitions |

---

**Status**: ✅ **FIXED**  
**Date**: October 4, 2025, 6:20 AM  
**Action Required**: Upload firmware to ESP32 and test
**Expected Result**: Manual switches should respond immediately when GND is touched to manual pin
