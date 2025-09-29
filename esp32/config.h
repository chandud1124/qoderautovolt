// config.h for ESP32 MQTT Classroom Automation
// Edit these values for your WiFi and device configuration

#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "I am Not A Witch I am Your Wifi"           // Your WiFi SSID
#define WIFI_PASSWORD "Whoareu@0000"   // Your WiFi password

#define DEVICE_SECRET "d6c498bc1c92fde490d198ec65048e20cd3cdb6a5c73e794" // Optional: Device secret/API key for authentication


// Aligned relay and manual switch pin mapping
// relayPins[i] corresponds to manualSwitchPins[i]
const int relayPins[6] = {16, 17, 18, 19, 21, 22};
const int manualSwitchPins[6] = {23, 25, 26, 27, 32, 33};

#endif // CONFIG_H
