/**
 * WARP ESP32 Classroom Automation - Stable Version
 * 
 * Features:
 * - 6 relay control with manual switches (momentary/maintained)
 * - Dual PIR/Microwave motion sensor support
 * - Per-switch PIR configuration (usePir, dontAutoOff)
 * - MQTT communication with backend
 * - Persistent state in NVS
 * - Watchdog protection with frequent resets
 * - Heap memory monitoring
 * - WiFi auto-reconnect
 * 
 * Created: 2025-10-26
 * Status: Production Ready
 */

#include <WiFi.h>
#include <AsyncMqttClient.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <esp_task_wdt.h>
#include <esp_system.h>
#include "config.h"
#include "blink_status.h"

// ========================================
// CONFIGURATION
// ========================================
// All board / network / MQTT / pin configuration moved to esp32/config.h
// Edit esp32/config.h to change WiFi, MQTT, topics, pins, and timing constants.

// ========================================
// GLOBAL VARIABLES
// ========================================
AsyncMqttClient mqttClient;
Preferences prefs;
char mqttClientId[24];
ConnState connState = WIFI_DISCONNECTED;

// Async MQTT callbacks
void onMqttConnect(bool sessionPresent);
void onMqttDisconnect(AsyncMqttClientDisconnectReason reason);
void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total);
void onMqttPublish(uint16_t packetId);

// Switch state structure
struct SwitchState {
  int relayGpio;
  int manualGpio;
  bool state;
  bool manualOverride;
  bool manualEnabled;
  bool manualActiveLow;
  bool manualMomentary;
  int lastManualLevel;
  unsigned long lastManualChangeMs;
  int stableManualLevel;
  bool lastManualActive;
  bool defaultState;
  int gpio;  // For compatibility
  bool usePir;  // Per-switch PIR response
  bool dontAutoOff;  // Prevent auto-off
};
SwitchState switchesLocal[NUM_SWITCHES];
bool pinSetup[NUM_SWITCHES] = {false};

// Command queue
struct Command {
  int gpio;
  bool state;
  bool valid;
  unsigned long timestamp;
};
Command commandQueue[MAX_COMMAND_QUEUE];
int commandQueueHead = 0;
int commandQueueTail = 0;

// Motion sensor configuration
struct MotionSensorConfig {
  bool enabled;
  String type;  // "hc-sr501", "rcwl-0516", or "both"
  int primaryGpio;  // PIR (GPIO 34)
  int secondaryGpio;  // Microwave (GPIO 35)
  int autoOffDelay;
  String detectionLogic;  // "and", "or", or "weighted"
  bool dualMode;
};
MotionSensorConfig motionConfig = {
  false, "hc-sr501", 34, 35, 30, "and", false
};

// Motion sensor state
bool motionDetected = false;
bool lastMotionState = false;
unsigned long lastMotionTime = 0;
unsigned long motionStartTime = 0;
bool autoOffActive = false;
int affectedSwitches[NUM_SWITCHES] = {-1, -1, -1, -1, -1, -1};

// Timing variables
unsigned long lastStateSend = 0;
bool pendingState = false;
// Boot time to avoid spurious triggers right after boot
unsigned long bootTime = 0;

// --- Non-blocking debounce runtime state ---
unsigned long lastMotionSampleAt = 0;
uint8_t primaryConsecutive = 0;
uint8_t secondaryConsecutive = 0;
bool primaryStableState = false;
bool secondaryStableState = false;
bool lastPrimaryRaw = false;
bool lastSecondaryRaw = false;
// Track last successful heartbeat publish (ms)
unsigned long lastSuccessfulHeartbeatPublish = 0;
bool reportedOffline = false;
// Track the last heartbeat message id so we can mark success on PUBACK
uint16_t lastHeartbeatMsgId = 0;

// ========================================
// UTILITY FUNCTIONS
// ========================================
String normalizeMac(String mac) {
  String normalized = "";
  for (char c : mac) {
    if (isAlphaNumeric(c)) {
      normalized += tolower(c);
    }
  }
  return normalized;
}

int relayNameToGpio(const char* relay) {
  if (strcmp(relay, "relay1") == 0) return 16;
  if (strcmp(relay, "relay2") == 0) return 17;
  if (strcmp(relay, "relay3") == 0) return 18;
  if (strcmp(relay, "relay4") == 0) return 19;
  if (strcmp(relay, "relay5") == 0) return 21;
  if (strcmp(relay, "relay6") == 0) return 22;
  return -1;
}

// ========================================
// NVS PERSISTENCE
// ========================================
void loadSwitchConfigFromNVS() {
  prefs.begin("switch_cfg", true);
  for (int i = 0; i < NUM_SWITCHES; i++) {
    switchesLocal[i].relayGpio = prefs.getInt(("relay" + String(i)).c_str(), relayPins[i]);
    switchesLocal[i].manualGpio = prefs.getInt(("manual" + String(i)).c_str(), manualSwitchPins[i]);
    switchesLocal[i].defaultState = prefs.getBool(("def" + String(i)).c_str(), false);
    switchesLocal[i].state = prefs.getBool(("state" + String(i)).c_str(), false);
    switchesLocal[i].manualMomentary = prefs.getBool(("momentary" + String(i)).c_str(), true);
    switchesLocal[i].usePir = prefs.getBool(("usePir" + String(i)).c_str(), false);
    switchesLocal[i].dontAutoOff = prefs.getBool(("dontAutoOff" + String(i)).c_str(), false);
  }
  prefs.end();
  Serial.println("[NVS] Loaded switch config with PIR settings");
}

void saveSwitchConfigToNVS() {
  prefs.begin("switch_cfg", false);
  for (int i = 0; i < NUM_SWITCHES; i++) {
    prefs.putInt(("relay" + String(i)).c_str(), switchesLocal[i].relayGpio);
    prefs.putInt(("manual" + String(i)).c_str(), switchesLocal[i].manualGpio);
    prefs.putBool(("def" + String(i)).c_str(), switchesLocal[i].defaultState);
    prefs.putBool(("state" + String(i)).c_str(), switchesLocal[i].state);
    prefs.putBool(("momentary" + String(i)).c_str(), switchesLocal[i].manualMomentary);
    prefs.putBool(("usePir" + String(i)).c_str(), switchesLocal[i].usePir);
    prefs.putBool(("dontAutoOff" + String(i)).c_str(), switchesLocal[i].dontAutoOff);
  }
  prefs.end();
}

void initSwitches() {
  for (int i = 0; i < NUM_SWITCHES; i++) {
    switchesLocal[i].relayGpio = relayPins[i];
    switchesLocal[i].manualGpio = manualSwitchPins[i];
    switchesLocal[i].state = false;
    switchesLocal[i].manualOverride = false;
    switchesLocal[i].manualEnabled = true;
    switchesLocal[i].manualActiveLow = MANUAL_ACTIVE_LOW;
    switchesLocal[i].manualMomentary = true;
    switchesLocal[i].lastManualLevel = -1;
    switchesLocal[i].lastManualChangeMs = 0;
    switchesLocal[i].stableManualLevel = -1;
    switchesLocal[i].lastManualActive = false;
    switchesLocal[i].defaultState = false;
    switchesLocal[i].usePir = false;
    switchesLocal[i].dontAutoOff = false;
  }
  loadSwitchConfigFromNVS();
  
  // Apply loaded states to relays
  for (int i = 0; i < NUM_SWITCHES; i++) {
    pinMode(switchesLocal[i].relayGpio, OUTPUT);
    digitalWrite(switchesLocal[i].relayGpio, 
      switchesLocal[i].state ? (RELAY_ACTIVE_HIGH ? HIGH : LOW) : (RELAY_ACTIVE_HIGH ? LOW : HIGH));
    pinSetup[i] = false;
  }
}

// ========================================
// COMMAND QUEUE
// ========================================
void queueSwitchCommand(int gpio, bool state) {
  int nextTail = (commandQueueTail + 1) % MAX_COMMAND_QUEUE;
  if (nextTail == commandQueueHead) {
    Serial.println("[CMD] Queue full, dropping command");
    return;
  }
  commandQueue[commandQueueTail] = {gpio, state, true, millis()};
  commandQueueTail = nextTail;
  Serial.printf("[CMD] Queued: GPIO %d -> %s\n", gpio, state ? "ON" : "OFF");
}

void processCommandQueue() {
  static unsigned long lastProcess = 0;
  unsigned long now = millis();
  if (now - lastProcess < 10) return;
  lastProcess = now;

  int processed = 0;
  while (commandQueueHead != commandQueueTail && processed < 5) {
    Command &cmd = commandQueue[commandQueueHead];
    for (int i = 0; i < NUM_SWITCHES; i++) {
      if (switchesLocal[i].relayGpio == cmd.gpio) {
        switchesLocal[i].state = cmd.state;
        switchesLocal[i].manualOverride = false;
        digitalWrite(switchesLocal[i].relayGpio, 
          cmd.state ? (RELAY_ACTIVE_HIGH ? HIGH : LOW) : (RELAY_ACTIVE_HIGH ? LOW : HIGH));
        switchesLocal[i].gpio = switchesLocal[i].relayGpio;
        saveSwitchConfigToNVS();
        Serial.printf("[CMD] Applied: GPIO %d -> %s\n", cmd.gpio, cmd.state ? "ON" : "OFF");
        break;
      }
    }
    commandQueueHead = (commandQueueHead + 1) % MAX_COMMAND_QUEUE;
    processed++;
  }
}

// ========================================
// MANUAL SWITCH HANDLING
// ========================================
void handleManualSwitches() {
  unsigned long now = millis();
  for (int i = 0; i < NUM_SWITCHES; i++) {
    SwitchState &sw = switchesLocal[i];
    if (!sw.manualEnabled || sw.manualGpio < 0 || sw.manualGpio > 39) continue;

    // Setup pinMode first time
    if (!pinSetup[i]) {
      pinMode(sw.manualGpio, INPUT_PULLUP);
      pinMode(sw.relayGpio, OUTPUT);
      digitalWrite(sw.relayGpio, 
        sw.state ? (RELAY_ACTIVE_HIGH ? HIGH : LOW) : (RELAY_ACTIVE_HIGH ? LOW : HIGH));
      
      int initialLevel = digitalRead(sw.manualGpio);
      sw.lastManualLevel = initialLevel;
      sw.stableManualLevel = initialLevel;
      sw.lastManualActive = sw.manualActiveLow ? (initialLevel == LOW) : (initialLevel == HIGH);
      sw.lastManualChangeMs = now;
      pinSetup[i] = true;
    }

    int rawLevel = digitalRead(sw.manualGpio);
    bool active = sw.manualActiveLow ? (rawLevel == LOW) : (rawLevel == HIGH);

    // Detect level change
    if (rawLevel != sw.lastManualLevel) {
      sw.lastManualChangeMs = now;
      sw.lastManualLevel = rawLevel;
    }
    
    // Debounce
    if ((now - sw.lastManualChangeMs) > MANUAL_DEBOUNCE_MS) {
      if (rawLevel != sw.stableManualLevel) {
        sw.stableManualLevel = rawLevel;
        bool currentActive = sw.manualActiveLow ? (rawLevel == LOW) : (rawLevel == HIGH);
        
        if (sw.manualMomentary) {
          // Momentary: toggle on press
          if (currentActive && !sw.lastManualActive) {
            sw.state = !sw.state;
            sw.manualOverride = true;
            digitalWrite(sw.relayGpio, 
              sw.state ? (RELAY_ACTIVE_HIGH ? HIGH : LOW) : (RELAY_ACTIVE_HIGH ? LOW : HIGH));
            saveSwitchConfigToNVS();
            Serial.printf("[MANUAL] Momentary press: GPIO %d -> %s\n", 
              sw.relayGpio, sw.state ? "ON" : "OFF");
            publishManualSwitchEvent(sw.relayGpio, sw.state, sw.manualGpio);
            sendStateUpdate(true);
          }
        } else {
          // Maintained: follow switch state
          if (sw.state != currentActive) {
            sw.state = currentActive;
            sw.manualOverride = true;
            digitalWrite(sw.relayGpio, 
              sw.state ? (RELAY_ACTIVE_HIGH ? HIGH : LOW) : (RELAY_ACTIVE_HIGH ? LOW : HIGH));
            saveSwitchConfigToNVS();
            Serial.printf("[MANUAL] Maintained: GPIO %d -> %s\n", 
              sw.relayGpio, sw.state ? "ON" : "OFF");
            publishManualSwitchEvent(sw.relayGpio, sw.state, sw.manualGpio);
            sendStateUpdate(true);
          }
        }
        sw.lastManualActive = currentActive;
      }
    }
  }
}

// ========================================
// MOTION SENSOR FUNCTIONS
// ========================================
// Non-blocking sampler: called frequently from loop(), updates
// primaryStableState / secondaryStableState based on consecutive samples.
void sampleMotionSensorsNonBlocking() {
  if (!motionConfig.enabled) return;
  unsigned long now = millis();
  if (now - lastMotionSampleAt < MOTION_SAMPLE_INTERVAL_MS) return;
  lastMotionSampleAt = now;

  // Primary
  bool rawPrimary = digitalRead(motionConfig.primaryGpio) == HIGH;
  if (rawPrimary != lastPrimaryRaw) {
    lastPrimaryRaw = rawPrimary;
    primaryConsecutive = 1;
  } else {
    if (primaryConsecutive < 255) primaryConsecutive++;
    if (primaryConsecutive >= MOTION_REQUIRED_CONSISTENT && primaryStableState != rawPrimary) {
      primaryStableState = rawPrimary;
      Serial.printf("[MOTION] Primary stable -> %s\n", primaryStableState ? "HIGH" : "LOW");
    }
  }

  // Secondary (if enabled)
  if (motionConfig.dualMode) {
    bool rawSecondary = digitalRead(motionConfig.secondaryGpio) == HIGH;
    if (rawSecondary != lastSecondaryRaw) {
      lastSecondaryRaw = rawSecondary;
      secondaryConsecutive = 1;
    } else {
      if (secondaryConsecutive < 255) secondaryConsecutive++;
      if (secondaryConsecutive >= MOTION_REQUIRED_CONSISTENT && secondaryStableState != rawSecondary) {
        secondaryStableState = rawSecondary;
        Serial.printf("[MOTION] Secondary stable -> %s\n", secondaryStableState ? "HIGH" : "LOW");
      }
    }
  }
}

void initMotionSensor() {
  if (!motionConfig.enabled) {
    Serial.println("[MOTION] Disabled");
    return;
  }
  // Configure pinMode based on config macro (allow choosing INPUT or INPUT_PULLDOWN)
  pinMode(motionConfig.primaryGpio, MOTION_USE_INPUT_PULLDOWN ? INPUT_PULLDOWN : INPUT);
  Serial.printf("[MOTION] Primary sensor (PIR) on GPIO %d (%s)\n", motionConfig.primaryGpio,
    MOTION_USE_INPUT_PULLDOWN ? "INPUT_PULLDOWN" : "INPUT");

  if (motionConfig.dualMode) {
    pinMode(motionConfig.secondaryGpio, MOTION_USE_INPUT_PULLDOWN ? INPUT_PULLDOWN : INPUT);
    Serial.printf("[MOTION] Secondary sensor (Microwave) on GPIO %d (%s)\n", motionConfig.secondaryGpio,
      MOTION_USE_INPUT_PULLDOWN ? "INPUT_PULLDOWN" : "INPUT");
  }
  
  Serial.printf("[MOTION] Config: type=%s, autoOff=%ds, logic=%s\n",
    motionConfig.type.c_str(), motionConfig.autoOffDelay, motionConfig.detectionLogic.c_str());
}

bool readMotionSensor() {
  if (!motionConfig.enabled) return false;
  // Return the debounced stable states sampled by sampleMotionSensorsNonBlocking()
  bool primaryActive = primaryStableState;

  if (motionConfig.dualMode) {
    bool secondaryActive = secondaryStableState;

    if (motionConfig.detectionLogic == "and") {
      return primaryActive && secondaryActive;
    } else if (motionConfig.detectionLogic == "or") {
      return primaryActive || secondaryActive;
    } else if (motionConfig.detectionLogic == "weighted") {
      int confidence = 0;
      if (primaryActive) confidence += 60;
      if (secondaryActive) confidence += 40;
      return confidence >= 70;
    }
  }

  return primaryActive;
}

void publishMotionEvent(bool detected) {
  if (!motionConfig.enabled || ESP.getFreeHeap() < 1000) return;
  
  DynamicJsonDocument doc(256);
  doc["mac"] = WiFi.macAddress();
  doc["secret"] = DEVICE_SECRET;
  doc["type"] = "motion";
  doc["detected"] = detected;
  doc["sensorType"] = motionConfig.type;
  doc["timestamp"] = millis();
  
  if (motionConfig.dualMode) {
    doc["pirState"] = digitalRead(motionConfig.primaryGpio) == HIGH;
    doc["microwaveState"] = digitalRead(motionConfig.secondaryGpio) == HIGH;
    doc["logic"] = motionConfig.detectionLogic;
  }
  
  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  if (n > 0 && mqttClient.connected()) {
    // Async publish with QoS and payload length
    mqttClient.publish(TELEMETRY_TOPIC, STATUS_QOS, false, buf, n);
    Serial.printf("[MOTION] Event published: %s\n", detected ? "DETECTED" : "STOPPED");
  }
}

void handleMotionSensor() {
  // Ignore motion handling entirely until grace period after boot has passed
  if (millis() - bootTime < MOTION_BOOT_GRACE_MS) return;
  if (!motionConfig.enabled) return;
  
  unsigned long now = millis();
  bool currentMotion = readMotionSensor();
  
  // Motion started
  if (currentMotion && !motionDetected) {
    motionDetected = true;
    motionStartTime = now;
    lastMotionTime = now;
    autoOffActive = false;
    
    Serial.println("[MOTION] 🔴 DETECTED - Turning ON switches");
    
    // Turn ON switches with usePir enabled
    for (int i = 0; i < NUM_SWITCHES; i++) {
      if (!switchesLocal[i].usePir || switchesLocal[i].manualOverride) continue;
      
      if (!switchesLocal[i].state) {
        switchesLocal[i].state = true;
        digitalWrite(switchesLocal[i].relayGpio, RELAY_ACTIVE_HIGH ? HIGH : LOW);
        affectedSwitches[i] = 1;
        Serial.printf("[MOTION] Switch %d (GPIO %d) ON\n", i, switchesLocal[i].relayGpio);
      }
    }
    
    publishMotionEvent(true);
    sendStateUpdate(true);
  }
  
  // Motion continues
  if (currentMotion && motionDetected) {
    lastMotionTime = now;
  }
  
  // Motion stopped - start auto-off
  if (!currentMotion && motionDetected && !autoOffActive) {
    unsigned long timeSinceLastMotion = (now - lastMotionTime) / 1000;
    
    if (timeSinceLastMotion >= motionConfig.autoOffDelay) {
      autoOffActive = true;
      motionDetected = false;
      
      Serial.printf("[MOTION] ⚫ No motion for %ds - Turning OFF switches\n", motionConfig.autoOffDelay);
      
      // Turn OFF switches (except dontAutoOff ones)
      for (int i = 0; i < NUM_SWITCHES; i++) {
        if (switchesLocal[i].dontAutoOff || switchesLocal[i].manualOverride) continue;
        
        if (affectedSwitches[i] == 1 && switchesLocal[i].state) {
          switchesLocal[i].state = false;
          digitalWrite(switchesLocal[i].relayGpio, RELAY_ACTIVE_HIGH ? LOW : HIGH);
          affectedSwitches[i] = -1;
          Serial.printf("[MOTION] Switch %d (GPIO %d) OFF\n", i, switchesLocal[i].relayGpio);
        }
      }
      
      publishMotionEvent(false);
      sendStateUpdate(true);
    }
  }
}

// ========================================
// MQTT FUNCTIONS
// ========================================
void publishState() {
  if (ESP.getFreeHeap() < 2000) return;
  
  DynamicJsonDocument doc(512);
  doc["mac"] = WiFi.macAddress();
  doc["secret"] = DEVICE_SECRET;
  JsonArray arr = doc.createNestedArray("switches");
  
  for (int i = 0; i < NUM_SWITCHES; i++) {
    JsonObject o = arr.createNestedObject();
    o["gpio"] = switchesLocal[i].relayGpio;
    o["state"] = switchesLocal[i].state;
    o["manual_override"] = switchesLocal[i].manualOverride;
  }
  
  char buf[512];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  // Ensure serialization did not truncate and MQTT connection is available
  if (n > 0 && n < sizeof(buf) && mqttClient.connected()) {
    mqttClient.publish(STATE_TOPIC, STATUS_QOS, false, buf, n);
  }
}

// Note: older PubSubClient-style mqttCallback removed. AsyncMqttClient
// handling is implemented in onMqttMessage() below.

void publishManualSwitchEvent(int gpio, bool state, int physicalPin) {
  if (ESP.getFreeHeap() < 1000) return;
  
  DynamicJsonDocument doc(128);
  doc["mac"] = WiFi.macAddress();
  doc["secret"] = DEVICE_SECRET;
  doc["type"] = "manual_switch";
  doc["gpio"] = gpio;
  doc["state"] = state;
  if (physicalPin >= 0) doc["physicalPin"] = physicalPin;
  doc["timestamp"] = millis();
  
  char buf[128];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  if (n > 0 && mqttClient.connected()) {
    mqttClient.publish(TELEMETRY_TOPIC, STATUS_QOS, false, buf, n);
  }
}

void sendStateUpdate(bool force) {
  static unsigned long lastStateSent = 0;
  static uint32_t lastStateHash = 0;
  unsigned long now = millis();
  
  uint32_t stateHash = 0;
  for (int i = 0; i < NUM_SWITCHES; i++) {
    stateHash ^= (switchesLocal[i].state ? (1 << i) : 0);
    stateHash ^= (switchesLocal[i].manualOverride ? (1 << (i+8)) : 0);
  }
  
  bool changed = (stateHash != lastStateHash);
  if (force || changed || (now - lastStateSent > 5000)) {
    publishState();
    lastStateSent = now;
    lastStateHash = stateHash;
    pendingState = false;
  } else {
    pendingState = true;
  }
}

void sendHeartbeat() {
  static unsigned long lastHeartbeat = 0;
  unsigned long now = millis();
  if (now - lastHeartbeat < 30000) return;
  lastHeartbeat = now;
  
  DynamicJsonDocument doc(128);
  doc["mac"] = WiFi.macAddress();
  doc["status"] = "heartbeat";
  doc["heap"] = ESP.getFreeHeap();
  
  char buf[128];
  size_t n = serializeJson(doc, buf);
  if (mqttClient.connected()) {
    // Async publish: returns a message id (non-zero if queued)
    uint16_t msgId = mqttClient.publish(TELEMETRY_TOPIC, STATUS_QOS, false, buf, n);
    if (msgId) {
      // Wait for PUBACK to consider heartbeat successful; store msgId for onMqttPublish()
      lastHeartbeatMsgId = msgId;
      Serial.printf("[HEART] Heartbeat queued (msgId=%u)\n", msgId);
    } else {
      Serial.println("[HEART] Failed to queue heartbeat");
    }
  }

  // If we haven't successfully published a heartbeat for over OFFLINE_TIMEOUT_MS, mark offline locally
  if (millis() - lastSuccessfulHeartbeatPublish > OFFLINE_TIMEOUT_MS) {
    if (!reportedOffline) {
      reportedOffline = true;
      Serial.printf("[STATUS] No heartbeat published for >%ds - marking OFFLINE locally\n", OFFLINE_TIMEOUT_MS/1000);
      // Attempt to publish offline retained status (best-effort)
      if (mqttClient.connected()) mqttClient.publish(STATUS_TOPIC, STATUS_QOS, true, STATUS_OFFLINE);
    }
  }
}



void reconnect_mqtt() {
  static unsigned long lastAttempt = 0;
  static unsigned long connectStartTime = 0;
  static bool connecting = false;
  
  unsigned long now = millis();
  
  // Don't attempt reconnection too frequently
  if (!connecting && (now - lastAttempt < 5000)) return;
  
  // Start new connection attempt
  if (!connecting) {
    lastAttempt = now;
    connecting = true;
    connectStartTime = now;
    Serial.println("[MQTT] Attempting async connect...");

    // Configure credentials and Last Will before connecting
    // Ensure a stable client id (built in setup_wifi)
    mqttClient.setClientId(mqttClientId);
    mqttClient.setCredentials(MQTT_USER, MQTT_PASSWORD);
    mqttClient.setWill(STATUS_TOPIC, STATUS_QOS, true, STATUS_OFFLINE);
    mqttClient.connect();
  }

  // Timeout after 3 seconds to prevent stuck connecting state
  if (connecting && (now - connectStartTime > 3000)) {
    connecting = false;
    Serial.println("[MQTT] Connection attempt timed out");
    connState = WIFI_ONLY;
    return;
  }
}

// ========================
// Async MQTT callbacks
// ========================
void onMqttConnect(bool sessionPresent) {
  Serial.println("[MQTT] Async connected");
  // Publish retained 'online' status so server/broker know device is up
  mqttClient.publish(STATUS_TOPIC, STATUS_QOS, true, STATUS_ONLINE);
  lastSuccessfulHeartbeatPublish = millis();
  reportedOffline = false;

  // Subscribe to topics with desired QoS
  mqttClient.subscribe(SWITCH_TOPIC, STATUS_QOS);
  mqttClient.subscribe(CONFIG_TOPIC, STATUS_QOS);

  sendStateUpdate(true);
  connState = BACKEND_CONNECTED;
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  Serial.printf("[MQTT] Async disconnected (%d)\n", (int)reason);
  connState = WIFI_ONLY;
}

void onMqttPublish(uint16_t packetId) {
  // Handle PUBACKs for QoS1 publishes. If this ACK corresponds to a
  // heartbeat message we queued earlier, mark the heartbeat as successful.
  if (packetId == lastHeartbeatMsgId && packetId != 0) {
    lastSuccessfulHeartbeatPublish = millis();
    lastHeartbeatMsgId = 0;
    if (reportedOffline) {
      // Republish retained ONLINE now that we have confirmation
      mqttClient.publish(STATUS_TOPIC, STATUS_QOS, true, STATUS_ONLINE);
      reportedOffline = false;
      Serial.println("[STATUS] Recovered - published ONLINE (ack)");
    } else {
      Serial.printf("[MQTT] Heartbeat ack: %u\n", packetId);
    }
  } else {
    Serial.printf("[MQTT] Publish ack: %u\n", packetId);
  }
}

void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total) {
  // Reconstruct payload into a String (payload is not null-terminated)
  String message;
  message.reserve(len + 1);
  for (size_t i = 0; i < len; i++) message += payload[i];

  Serial.printf("[MQTT] %s: %s\n", topic, message.c_str());

  // Handle SWITCH_TOPIC
  if (String(topic) == SWITCH_TOPIC) {
    DynamicJsonDocument doc(256);
    if (deserializeJson(doc, message) == DeserializationError::Ok) {
      String targetMac = doc["mac"];
      String targetSecret = doc["secret"];
      String myMac = WiFi.macAddress();

      if (normalizeMac(targetMac).equalsIgnoreCase(normalizeMac(myMac)) && targetSecret == String(DEVICE_SECRET)) {
        int gpio = doc["gpio"];
        bool state = doc["state"];
        queueSwitchCommand(gpio, state);
        processCommandQueue();
      }
    }
  }

  // Handle CONFIG_TOPIC
  if (String(topic) == CONFIG_TOPIC) {
    DynamicJsonDocument doc(512);
    if (deserializeJson(doc, message) == DeserializationError::Ok) {
      String targetMac = doc["mac"];
      String targetSecret = doc["secret"];
      String myMac = WiFi.macAddress();

      if (normalizeMac(targetMac).equalsIgnoreCase(normalizeMac(myMac)) && targetSecret == String(DEVICE_SECRET)) {
        // Update switch config
        if (doc.containsKey("switches")) {
          JsonArray sws = doc["switches"];
          int n = sws.size();
          if (n > 0 && n <= NUM_SWITCHES) {
                for (int i = 0; i < n; i++) {
                  JsonObject sw = sws[i];
                  if (sw.containsKey("gpio")) {
                    relayPins[i] = (int)sw["gpio"];
                  }
                  if (sw.containsKey("manualGpio")) {
                    manualSwitchPins[i] = (int)sw["manualGpio"];
                  }
                  // Support per-switch PIR assignment and dontAutoOff
                  if (sw.containsKey("usePir")) {
                    switchesLocal[i].usePir = (bool)sw["usePir"];
                  }
                  if (sw.containsKey("dontAutoOff")) {
                    switchesLocal[i].dontAutoOff = (bool)sw["dontAutoOff"];
                  }
                  if (sw.containsKey("manualMode")) {
                    const char* mode_c = sw["manualMode"] | "";
                    String mode = String(mode_c);
                    switchesLocal[i].manualMomentary = (mode == "momentary");
                  }
                }

            // Persist to NVS
            prefs.begin("switch_cfg", false);
            for (int i = 0; i < n; i++) {
              prefs.putInt(("relay" + String(i)).c_str(), relayPins[i]);
              prefs.putInt(("manual" + String(i)).c_str(), manualSwitchPins[i]);
              prefs.putBool(("momentary" + String(i)).c_str(), switchesLocal[i].manualMomentary);
              prefs.putBool(("usePir" + String(i)).c_str(), switchesLocal[i].usePir);
              prefs.putBool(("dontAutoOff" + String(i)).c_str(), switchesLocal[i].dontAutoOff);
            }
            prefs.end();

            initSwitches();
            Serial.println("[CONFIG] Switch config updated from server");
          }
        }

        // Motion sensor config (optional nested object)
        if (doc.containsKey("motionSensor")) {
          JsonObject ms = doc["motionSensor"];
          bool wasEnabled = motionConfig.enabled;
          if (ms.containsKey("enabled")) motionConfig.enabled = (bool)ms["enabled"];
          if (ms.containsKey("type")) motionConfig.type = String((const char*)ms["type"]);
          if (ms.containsKey("autoOffDelay")) motionConfig.autoOffDelay = (int)ms["autoOffDelay"];
          motionConfig.dualMode = (String(motionConfig.type) == "both");
          if (ms.containsKey("detectionLogic")) motionConfig.detectionLogic = String((const char*)ms["detectionLogic"]);

          prefs.begin("motion_cfg", false);
          prefs.putBool("enabled", motionConfig.enabled);
          prefs.putString("type", motionConfig.type);
          prefs.putInt("autoOff", motionConfig.autoOffDelay);
          prefs.putBool("dualMode", motionConfig.dualMode);
          prefs.putString("logic", motionConfig.detectionLogic);
          prefs.end();

          if (motionConfig.enabled != wasEnabled || motionConfig.enabled) initMotionSensor();
          Serial.println("[CONFIG] Motion config updated from server");
        }
      }
    }
  }
}

// ========================================
// WIFI FUNCTIONS
// ========================================
void setup_wifi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 50) {
    delay(100);
    handleManualSwitches();
    esp_task_wdt_reset();
    Serial.print(".");
    retries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.printf("Signal: %d dBm\n", WiFi.RSSI());
    connState = WIFI_ONLY;
    
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    sprintf(mqttClientId, "ESP32_%s", mac.c_str());
  } else {
    Serial.println("\nWiFi failed - offline mode");
    connState = WIFI_DISCONNECTED;
  }
}

void updateConnectionStatus() {
  static ConnState lastState = WIFI_DISCONNECTED;
  
  if (WiFi.status() != WL_CONNECTED) {
    connState = WIFI_DISCONNECTED;
  } else if (!mqttClient.connected()) {
    connState = WIFI_ONLY;
  } else {
    connState = BACKEND_CONNECTED;
  }
  
  if (connState != lastState) {
    lastState = connState;
    if (connState == BACKEND_CONNECTED) {
      sendStateUpdate(true);
    }
  }
}

// ========================================
// SYSTEM HEALTH
// ========================================
void checkSystemHealth() {
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < 10000) return;
  lastCheck = millis();
  
  size_t freeHeap = ESP.getFreeHeap();
  Serial.printf("[HEALTH] Heap: %u bytes\n", freeHeap);
  
  if (freeHeap < 5000) {
    Serial.printf("[CRITICAL] Low heap: %u bytes!\n", freeHeap);
  }
  
  int activeSwitches = 0;
  for (int i = 0; i < NUM_SWITCHES; i++) {
    if (switchesLocal[i].state) activeSwitches++;
  }
  Serial.printf("[HEALTH] Active switches: %d/%d\n", activeSwitches, NUM_SWITCHES);
}

// ========================================
// SETUP
// ========================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n========================================");
  Serial.println("WARP ESP32 Classroom Automation");
  Serial.println("Version: Stable 1.0");
  Serial.println("========================================\n");
  
  // Record boot time to ignore sensor noise immediately after boot
  bootTime = millis();

  // Boot recovery check
  int resetReason = esp_reset_reason();
  Serial.printf("[BOOT] Reset reason: %d\n", resetReason);
  if (resetReason == 1 || resetReason == 5 || resetReason == 6) {
    Serial.println("[BOOT] Crash recovery detected");
    delay(1000);
  }
  
  // Initialize watchdog (15 seconds)
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = WDT_TIMEOUT_MS,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);
  Serial.printf("[WDT] Watchdog initialized: %d seconds\n", WDT_TIMEOUT_MS / 1000);
  
  // Initialize switches
  initSwitches();
  
  // Load motion sensor config
  prefs.begin("motion_cfg", true);
  motionConfig.enabled = prefs.getBool("enabled", false);
  motionConfig.type = prefs.getString("type", "hc-sr501");
  motionConfig.autoOffDelay = prefs.getInt("autoOff", 30);
  motionConfig.dualMode = prefs.getBool("dualMode", false);
  motionConfig.detectionLogic = prefs.getString("logic", "and");
  prefs.end();
  
  // Always initialize motion sensor
  initMotionSensor();
  Serial.printf("[SETUP] Motion: %s, GPIO: %d\n", 
    motionConfig.enabled ? "ENABLED" : "DISABLED", 
    motionConfig.primaryGpio);
  
  // Setup WiFi
  setup_wifi();
  
  // Setup MQTT
  // Async MQTT client setup
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  // credentials and will will be set before connect in reconnect_mqtt()/setup
  mqttClient.onConnect(onMqttConnect);
  mqttClient.onDisconnect(onMqttDisconnect);
  mqttClient.onMessage(onMqttMessage);
  mqttClient.onPublish(onMqttPublish);

  // If WiFi already connected, trigger an initial connect attempt
  if (WiFi.status() == WL_CONNECTED) {
    reconnect_mqtt();
  }
  
  Serial.println("\n[SETUP] Complete - Ready\n");
}

// ========================================
// MAIN LOOP
// ========================================
void loop() {
  esp_task_wdt_reset();
  
  // PRIORITY 1: Always handle manual switches first (no network delays)
  handleManualSwitches();
  esp_task_wdt_reset();
  
  // PRIORITY 2: Sample and handle motion sensor (non-blocking sampler)
  sampleMotionSensorsNonBlocking();
  handleMotionSensor();
  esp_task_wdt_reset();
  
  // PRIORITY 3: Network operations (can be slower)
  updateConnectionStatus();
  
  // Periodic state updates
  if (millis() - lastStateSend > 30000) {
    sendStateUpdate(true);
    lastStateSend = millis();
  }
  
  // Network operations only when WiFi is connected
  if (WiFi.status() == WL_CONNECTED) {
    // Try to reconnect MQTT if disconnected (non-blocking with timeout)
    if (!mqttClient.connected()) {
      reconnect_mqtt();
      esp_task_wdt_reset();
      // Continue handling manual switches even if connecting
    }
    
    // Process MQTT messages if connected (Async client handles network in background)
    if (mqttClient.connected()) {
      esp_task_wdt_reset();
      processCommandQueue();
    }
    sendHeartbeat();
  }
  
  blinkStatus();
  if (pendingState) sendStateUpdate(false);
  checkSystemHealth();
  
  // Re-apply relay states periodically
  static unsigned long lastRelayCheck = 0;
  if (millis() - lastRelayCheck > 5000) {
    for (int i = 0; i < NUM_SWITCHES; i++) {
      digitalWrite(switchesLocal[i].relayGpio, 
        switchesLocal[i].state ? (RELAY_ACTIVE_HIGH ? HIGH : LOW) : (RELAY_ACTIVE_HIGH ? LOW : HIGH));
    }
    lastRelayCheck = millis();
  }
  
  esp_task_wdt_reset();
  delay(10);
}
