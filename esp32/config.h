// config.h for ESP32 MQTT Classroom Automation
// Edit these values for your WiFi and device configuration

#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "AIMS-WIFI"           // Your WiFi SSID
#define WIFI_PASSWORD "Aimswifi#2025"   // Your WiFi password

#define DEVICE_SECRET "d6c498bc1c92fde490d198ec65048e20cd3cdb6a5c73e794" // Optional: Device secret/API key for authentication

// MQTT Broker Configuration - Update this to match your network
#define MQTT_BROKER "172.16.3.171"      // Backend server IP
#define MQTT_PORT 1883                  // MQTT port

// Aligned relay and manual switch pin mapping
// relayPins[i] corresponds to manualSwitchPins[i]
const int relayPins[6] = {16, 17, 18, 19, 21, 22};
const int manualSwitchPins[6] = {25, 26, 27, 32, 33, 23};

// Relay configuration
#define RELAY_ACTIVE_HIGH false  // Set to true if relays are active HIGH, false if active LOW
#define MANUAL_ACTIVE_LOW true  // Set to true if manual switches are active LOW (pulled up), false if active HIGH

#endif // CONFIG_H
