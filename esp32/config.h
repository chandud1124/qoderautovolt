// config.h for ESP32 MQTT Classroom Automation
// Edit these values for your WiFi and device configuration

#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "AIMS-WIFI"
#define WIFI_PASSWORD "Aimswifi#2025"

#define DEVICE_SECRET "351e01d4ccc5023263388c643badeb0a9672563d5bed0db7" // Optional: Device secret/API key for authentication

// MQTT Broker Configuration - Update this to match your network
#define MQTT_BROKER "172.16.3.171"      // Backend server IP
#define MQTT_PORT 1883                  // MQTT port

// Aligned relay and manual switch pin mapping
// relayPins[i] corresponds to manualSwitchPins[i]
int relayPins[6] = {16, 17, 18, 19, 21, 22};
int manualSwitchPins[6] = {25, 26, 27, 32, 33, 23};

// Relay configuration
#define RELAY_ACTIVE_HIGH false  // Set to true if relays are active HIGH, false if active LOW
#define MANUAL_ACTIVE_LOW true  // Set to true if manual switches are active LOW (pulled up), false if active HIGH

// Motion Sensor Configuration (Dual Sensor Support)
// Using INPUT-ONLY GPIO pins (34-39) - NO conflict with relays or manual switches!
// NOTE: These are DEFAULT values. Actual configuration is set via web application
// and received through MQTT from backend (esp32/config topic)
#define MOTION_SENSOR_ENABLED false     // Default: disabled (configured via web UI)
#define MOTION_SENSOR_TYPE "hc-sr501"   // Default: HC-SR501 PIR (configured via web UI)
#define MOTION_SENSOR_PIN 34            // DEFAULT PRIMARY sensor GPIO (configured via web UI)
#define SECONDARY_SENSOR_PIN 35         // DEFAULT SECONDARY sensor GPIO (configured via web UI)
#define MOTION_AUTO_OFF_DELAY 30        // Default: 30 seconds (configured via web UI)
#define MOTION_SENSITIVITY 50           // Default: 50% (configured via web UI)
#define MOTION_DETECTION_RANGE 7        // Default: 7 meters (configured via web UI)
#define DETECTION_LOGIC "and"           // Default: AND logic (configured via web UI)

// GPIO Pin Usage Summary:
// Relays:         16, 17, 18, 19, 21, 22 (OUTPUT)
// Manual Switches: 25, 26, 27, 32, 33, 23 (INPUT with pull-up)
// PIR Sensor:     34 (INPUT-ONLY, no conflict!)
// Microwave Sensor: 35 (INPUT-ONLY, no conflict!)
// Available:      36, 39 (INPUT-ONLY), 0, 2, 4, 5, 12, 13, 14, 15 (I/O)

#endif // CONFIG_H
