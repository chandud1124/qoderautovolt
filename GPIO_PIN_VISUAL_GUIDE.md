# ESP8266 vs ESP32 Pin Mapping - Visual Guide

## 🔌 ESP8266 NodeMCU Pin Layout

```
┌─────────────────────────────────────────┐
│         ESP8266 NodeMCU v3              │
│                                         │
│  3V3  ●                         ● VIN   │
│  GND  ●                         ● GND   │
│   TX  ●                         ● RST   │
│   RX  ●                         ● EN    │
│                                         │
│  D0 (GPIO 16) ●  🟢 MANUAL SW 2  ● 3V3  │
│  D1 (GPIO 5)  ●  🔵 RELAY 2      ● GND  │
│  D2 (GPIO 4)  ●  🔵 RELAY 1      ● CLK  │
│  D3 (GPIO 0)  ●  🟡 MANUAL SW 3  ● SD0  │
│  D4 (GPIO 2)  ●  🟡 MANUAL SW 4  ● CMD  │
│  D5 (GPIO 14) ●  🟢 MANUAL SW 1  ● SD1  │
│  D6 (GPIO 12) ●  🔵 RELAY 3      ● SD2  │
│  D7 (GPIO 13) ●  🔵 RELAY 4      ● SD3  │
│  D8 (GPIO 15) ●  ❌ AVOID        ● GND  │
│                                         │
└─────────────────────────────────────────┘

Legend:
🔵 = Relay Output (controls loads)
🟢 = Manual Switch Input (safe anytime)
🟡 = Manual Switch Input (⚠️ boot pins - don't press during reset)
❌ = Avoid (boot strapping pin)
```

## ⚡ ESP32 DevKit Pin Layout

```
┌─────────────────────────────────────────┐
│         ESP32 DevKit v1                 │
│                                         │
│  EN   ●                         ● VP    │
│  VP   ●                         ● VN    │
│  VN   ●                         ● 34 🟦 │
│  D34  ●  🟦 PIR INPUT           ● 35 🟦 │
│  D35  ●  🟦 PIR INPUT           ● 32 🟢 │
│  D32  ●  🟢 MANUAL SW 4         ● 33 🟢 │
│  D33  ●  🟢 MANUAL SW 5         ● 25 🟢 │
│  D25  ●  🟢 MANUAL SW 1         ● 26 🟢 │
│  D26  ●  🟢 MANUAL SW 2         ● 27 🟢 │
│  D27  ●  🟢 MANUAL SW 3         ● 14    │
│  D14  ●                         ● 12    │
│  D12  ●                         ● GND   │
│  GND  ●                         ● 13    │
│  D13  ●                         ● 9     │
│  SD2  ●                         ● 10    │
│  SD3  ●                         ● 11    │
│  CMD  ●                         ● VIN   │
│  5V   ●                         ● GND   │
│  CLK  ●                         ● 23 🟢 │
│  SD0  ●                         ● 22 🔵 │
│  SD1  ●                         ● TX    │
│  D15  ●                         ● RX    │
│  D2   ●  🟡 BOOT PIN            ● 21 🔵 │
│  D0   ●  🟡 BOOT PIN            ● GND   │
│  D4   ●                         ● 19 🔵 │
│  D16  ●  🔵 RELAY 1             ● 18 🔵 │
│  D17  ●  🔵 RELAY 2             ● 5     │
│  D5   ●                         ● 17 🔵 │
│  D18  ●  🔵 RELAY 3             ● 16 🔵 │
│  D19  ●  🔵 RELAY 4             ● 4     │
│  D21  ●  🔵 RELAY 5             ● 2     │
│  D22  ●  🔵 RELAY 6             ● 15    │
│  RX   ●                         ● 3V3   │
│  TX   ●                         ● GND   │
│  D23  ●  🟢 MANUAL SW 6         ● GND   │
│  GND  ●                         ● EN    │
│                                         │
└─────────────────────────────────────────┘

Legend:
🔵 = Relay Output (controls loads)
🟢 = Manual Switch Input (safe)
🟡 = Boot Pin (use with caution)
🟦 = Input Only (perfect for PIR sensors)
```

## 📊 Side-by-Side Comparison

### **Switch 1**
| Device | Relay GPIO | Manual GPIO | Notes |
|--------|-----------|-------------|-------|
| ESP8266 | GPIO 4 (D2) | GPIO 14 (D5) | ✅ Safe |
| ESP32 | GPIO 16 | GPIO 25 | ✅ Safe |

### **Switch 2**
| Device | Relay GPIO | Manual GPIO | Notes |
|--------|-----------|-------------|-------|
| ESP8266 | GPIO 5 (D1) | GPIO 16 (D0) | ✅ Safe |
| ESP32 | GPIO 17 | GPIO 26 | ✅ Safe |

### **Switch 3**
| Device | Relay GPIO | Manual GPIO | Notes |
|--------|-----------|-------------|-------|
| ESP8266 | GPIO 12 (D6) | GPIO 0 (D3) | ⚠️ Don't press GPIO 0 during boot |
| ESP32 | GPIO 18 | GPIO 27 | ✅ Safe |

### **Switch 4**
| Device | Relay GPIO | Manual GPIO | Notes |
|--------|-----------|-------------|-------|
| ESP8266 | GPIO 13 (D7) | GPIO 2 (D4) | ⚠️ Don't press GPIO 2 during boot |
| ESP32 | GPIO 19 | GPIO 32 | ✅ Safe |

### **Switch 5** (ESP32 only)
| Device | Relay GPIO | Manual GPIO | Notes |
|--------|-----------|-------------|-------|
| ESP32 | GPIO 21 | GPIO 33 | ✅ Safe |

### **Switch 6** (ESP32 only)
| Device | Relay GPIO | Manual GPIO | Notes |
|--------|-----------|-------------|-------|
| ESP32 | GPIO 22 | GPIO 23 | ✅ Safe |

## 🎨 Wiring Example: Switch 1

### **ESP8266 Wiring**
```
Relay 1:                    Manual Switch 1:
┌─────────────┐            ┌──────────────┐
│   GPIO 4    │───────────>│ Relay Module │───> Load (Light/Fan)
│   (D2)      │            │              │
└─────────────┘            └──────────────┘

                           ┌──────────────┐
        3.3V ──────────────┤ Pull-up      │
                           │   10kΩ       │
                           └──────┬───────┘
                                  │
    Manual Switch ────────────────┼──────> GPIO 14 (D5)
    (Active-Low)                  │
                                  │
                               Ground
```

### **ESP32 Wiring**
```
Relay 1:                    Manual Switch 1:
┌─────────────┐            ┌──────────────┐
│   GPIO 16   │───────────>│ Relay Module │───> Load (Light/Fan)
│             │            │              │
└─────────────┘            └──────────────┘

                           ┌──────────────┐
        3.3V ──────────────┤ Pull-up      │
                           │   10kΩ       │
                           └──────┬───────┘
                                  │
    Manual Switch ────────────────┼──────> GPIO 25
    (Active-Low)                  │
                                  │
                               Ground
```

## 💡 Configuration in Web Interface

### **ESP8266 Device Creation**

1. **Device Info:**
   ```
   Name: "Classroom A Lights"
   MAC: "6C:C8:40:4F:82:C0"
   Device Type: ESP8266 ← Important!
   ```

2. **Click "Add Switch"** → Auto-assigned:
   ```
   Switch 1:
   - Name: "Main Light"
   - Relay GPIO: 4
   - Manual Switch Enabled: ✓
   - Manual GPIO: 14
   - Manual Mode: Maintained
   ```

3. **Click "Add Switch" again** → Auto-assigned:
   ```
   Switch 2:
   - Name: "Fan"
   - Relay GPIO: 5
   - Manual Switch Enabled: ✓
   - Manual GPIO: 16
   - Manual Mode: Maintained
   ```

### **ESP32 Device Creation**

Same process, but with ESP32 pins:
```
Switch 1: GPIO 16 (relay), GPIO 25 (manual)
Switch 2: GPIO 17 (relay), GPIO 26 (manual)
Switch 3: GPIO 18 (relay), GPIO 27 (manual)
Switch 4: GPIO 19 (relay), GPIO 32 (manual)
Switch 5: GPIO 21 (relay), GPIO 33 (manual)
Switch 6: GPIO 22 (relay), GPIO 23 (manual)
```

## 🔧 Manual Override

If you need different pins:

1. Edit device
2. Expand switch
3. Change **Relay GPIO** or **Manual GPIO**
4. System validates no conflicts
5. Save → ESP device receives new config via MQTT

## ⚠️ Important Warnings

### **ESP8266 Boot Pins (GPIO 0 & 2)**
❌ **DON'T:**
- Press manual switches connected to GPIO 0 or 2 during ESP8266 boot/reset
- Use these pins for auto-on switches

✅ **DO:**
- Wire as active-low with pull-ups
- Use only for manual-controlled switches
- Keep switches unpressed during power-on

### **Both Devices**
❌ **NEVER use same GPIO for:**
- Both relay and manual switch
- Two different relays
- Two different manual switches

## 📱 Mobile App View

When configured correctly, you'll see:

```
┌──────────────────────────────┐
│ Classroom A Lights (ESP8266) │
│ ● ONLINE                     │
├──────────────────────────────┤
│ 🔵 Main Light        [ON  ]  │
│    GPIO 4 (Manual: GPIO 14)  │
│                              │
│ 🔵 Fan              [OFF ]  │
│    GPIO 5 (Manual: GPIO 16)  │
│                              │
│ 🔵 Projector        [ON  ]  │
│    GPIO 12 (Manual: GPIO 0)  │
│                              │
│ 🔵 AC Unit          [OFF ]  │
│    GPIO 13 (Manual: GPIO 2)  │
└──────────────────────────────┘
```

---

**Visual Guide Created:** October 8, 2025  
**Auto-Assignment:** Enabled in DeviceConfigDialog.tsx  
**Default Pins Match:** esp8266_config.h specification
