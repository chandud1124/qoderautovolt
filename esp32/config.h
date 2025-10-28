// config.h for ESP32 MQTT Classroom Automation
// Edit these values for your WiFi and device configuration

#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "AIMS-WIFI"
#define WIFI_PASSWORD "Aimswifi#2025"

#define DEVICE_SECRET "351e01d4ccc5023263388c643badeb0a9672563d5bed0db7" // Optional: Device secret/API key for authentication

// General firmware configuration
#define NUM_SWITCHES 6
#define MAX_COMMAND_QUEUE 16
#define MANUAL_DEBOUNCE_MS 100
#define WDT_TIMEOUT_MS 15000  // 15 seconds watchdog

// MQTT Broker Configuration - Update this to match your network
#define MQTT_BROKER "172.16.3.171"      // Backend server IP
#define MQTT_PORT 1883                  // MQTT port
#define MQTT_USER "f3d2a8a068437f9a18f3c47a365c22bfab61f6a90cb03e0b"
#define MQTT_PASSWORD ""

// MQTT topics
#define STATE_TOPIC "esp32/state"
#define SWITCH_TOPIC "esp32/switches"
#define CONFIG_TOPIC "esp32/config"
#define TELEMETRY_TOPIC "esp32/telemetry"

// MQTT client buffer size
#define MQTT_BUFFER_SIZE 1024

// Status topic and payloads (retained). Broker will hold retained 'online' or LWT 'offline'.
#define STATUS_TOPIC "esp32/status"
#define STATUS_ONLINE "online"
#define STATUS_OFFLINE "offline"
// Offline timeout (ms) used locally to mark device offline if no successful heartbeat
#define OFFLINE_TIMEOUT_MS 60000

// Status QoS for LWT and status publishes. Note: PubSubClient supports QoS for LWT
// during connect. Regular publish() QoS depends on the MQTT client library.
#define STATUS_QOS 1

// Aligned relay and manual switch pin mapping
// relayPins[i] corresponds to manualSwitchPins[i]
int relayPins[NUM_SWITCHES] = {16, 17, 18, 19, 21, 22};
int manualSwitchPins[NUM_SWITCHES] = {25, 26, 27, 32, 33, 23};

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

// Motion input mode: choose internal pull-down vs plain input
// Some PIR modules may not work with internal pull-downs; set to false to use INPUT instead.
#define MOTION_USE_INPUT_PULLDOWN true

// Non-blocking debounce settings (sample over multiple loop cycles)
// Sample interval and required consecutive consistent samples
#define MOTION_SAMPLE_INTERVAL_MS 50
#define MOTION_REQUIRED_CONSISTENT 3

// Time after boot to ignore motion sensors (ms)
#define MOTION_BOOT_GRACE_MS 5000

// GPIO Pin Usage Summary:
// Relays:         16, 17, 18, 19, 21, 22 (OUTPUT)
// Manual Switches: 25, 26, 27, 32, 33, 23 (INPUT with pull-up)
// PIR Sensor:     34 (INPUT-ONLY, no conflict!)
// Microwave Sensor: 35 (INPUT-ONLY, no conflict!)
// Available:      36, 39 (INPUT-ONLY), 0, 2, 4, 5, 12, 13, 14, 15 (I/O)

#endif // CONFIG_H
