// config.h - ESP8266 Configuration
// Compatible with both ESP32 and ESP8266

#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "AIMS-WIFI"           // Your WiFi SSID
#define WIFI_PASSWORD "Aimswifi#2025"   // Your WiFi password

// Device Authentication
#define DEVICE_SECRET "81742e8ed7732de20885894514bbae323078c5cd39af9571"

// Relay Configuration (ESP8266-safe GPIO pins)
#define relayPins {4, 5, 12, 13, 14, 16}  // GPIO 4,5,12,13,14,16 (safe for ESP8266)

// Manual Switch Configuration (limited inputs for ESP8266)
#define manualSwitchPins {0, 2, 15, -1, -1, -1}  // GPIO 0,2,15 (others disabled)

// Relay Active Level (HIGH = active high, LOW = active low)
#define RELAY_ACTIVE_HIGH true

// Manual Switch Active Level (true = active low with pullup, false = active high)
#define MANUAL_ACTIVE_LOW true

// Status LED Pin (ESP8266-safe)
#ifndef STATUS_LED_PIN
#define STATUS_LED_PIN 2  // GPIO 2 (safe for ESP8266)
#endif

#endif // CONFIG_H