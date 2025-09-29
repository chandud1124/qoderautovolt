#ifndef STATUS_LED_PIN
#define STATUS_LED_PIN 2
#endif

// --- INCLUDES AND GLOBALS (must be before all function usage) ---
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <esp_task_wdt.h>
#include <map>
#include "config.h"

Preferences prefs;

// --- Connection State Enum and Status LED ---
enum ConnState {
  WIFI_DISCONNECTED,
  WIFI_ONLY,
  BACKEND_CONNECTED
};
ConnState connState = WIFI_DISCONNECTED;

void blinkStatus() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  unsigned long now = millis();
  int pattern = 0;

  if (connState == WIFI_DISCONNECTED) {
    // Fast blink (250ms on, 250ms off)
    pattern = (now % 500) < 250;
  } else if (connState == WIFI_ONLY) {
    // Slow blink (1s on, 1s off)
    pattern = (now % 2000) < 1000;
  } else if (connState == BACKEND_CONNECTED) {
    // LED constantly ON
    pattern = 1;
  }

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, pattern ? HIGH : LOW);
}

// --- Offline event buffering and NVS persistence ---
struct OfflineEvent {
  int gpio;
  bool previousState;
  bool newState;
  unsigned long timestamp;
  bool valid;
};

#define MAX_OFFLINE_EVENTS 50
std::vector<OfflineEvent> offlineEvents;

void queueOfflineEvent(int gpio, bool previousState, bool newState) {
  if (offlineEvents.size() >= MAX_OFFLINE_EVENTS) {
    offlineEvents.erase(offlineEvents.begin());
  }
  OfflineEvent event = {gpio, previousState, newState, millis(), true};
  offlineEvents.push_back(event);
  saveOfflineEventsToNVS();
  Serial.printf("[OFFLINE] Queued event: GPIO %d %s -> %s (buffer: %d/%d)\n",
    gpio, previousState ? "ON" : "OFF", newState ? "ON" : "OFF", (int)offlineEvents.size(), MAX_OFFLINE_EVENTS);
}

void saveOfflineEventsToNVS() {
  prefs.begin("offline_events", false);
  int numEvents = std::min((int)offlineEvents.size(), MAX_OFFLINE_EVENTS);
  prefs.putInt("count", numEvents);
  for (int i = 0; i < numEvents; i++) {
    prefs.putInt(("gpio" + String(i)).c_str(), offlineEvents[i].gpio);
    prefs.putBool(("prev" + String(i)).c_str(), offlineEvents[i].previousState);
    prefs.putBool(("new" + String(i)).c_str(), offlineEvents[i].newState);
    prefs.putULong(("ts" + String(i)).c_str(), offlineEvents[i].timestamp);
    prefs.putBool(("valid" + String(i)).c_str(), offlineEvents[i].valid);
  }
  prefs.end();
  Serial.printf("[NVS] Saved %d offline events\n", numEvents);
}

void loadOfflineEventsFromNVS() {
  prefs.begin("offline_events", true);
  int numEvents = prefs.getInt("count", 0);
  if (numEvents <= 0 || numEvents > MAX_OFFLINE_EVENTS) {
    prefs.end();
    return;
  }
  offlineEvents.clear();
  for (int i = 0; i < numEvents; i++) {
    OfflineEvent event;
    event.gpio = prefs.getInt(("gpio" + String(i)).c_str(), -1);
    event.previousState = prefs.getBool(("prev" + String(i)).c_str(), false);
    event.newState = prefs.getBool(("new" + String(i)).c_str(), false);
    event.timestamp = prefs.getULong(("ts" + String(i)).c_str(), 0);
    event.valid = prefs.getBool(("valid" + String(i)).c_str(), false);
    if (event.gpio >= 0 && event.valid) offlineEvents.push_back(event);
  }
  prefs.end();
  Serial.printf("[NVS] Loaded %d offline events\n", (int)offlineEvents.size());
}

void sendQueuedOfflineEvents() {
  if (offlineEvents.empty()) return;
  Serial.printf("[OFFLINE] Sending %d queued events...\n", (int)offlineEvents.size());
  for (auto &event : offlineEvents) {
    // Publish as state update or event (for now, just publish state)
    publishState();
  }
  offlineEvents.clear();
  saveOfflineEventsToNVS();
  Serial.println("[OFFLINE] Cleared offline event queue");
}

// --- Status LED patterns ---
#ifndef STATUS_LED_PIN
#define STATUS_LED_PIN 2
#endif

// Topics:
//   - "esp32/switches" (subscribe): backend -> ESP32 switch commands
//   - "esp32/state" (publish): ESP32 -> backend state updates
//   - "esp32/telemetry" (publish): ESP32 -> backend telemetry (optional)

// --- GLOBALS AND MACROS (must be before all function usage) ---

#define MQTT_BROKER "192.168.0.108" // Set to backend IP or broker IP
#define MQTT_PORT 1883
#define MQTT_CLIENT_ID "esp32_001"
#define MQTT_USER "d6c498bc1c92fde490d198ec65048e20cd3cdb6a5c73e794"
#define MQTT_PASSWORD ""
#define SWITCH_TOPIC "esp32/switches"
#define STATE_TOPIC "esp32/state"
#define TELEMETRY_TOPIC "esp32/telemetry"

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Number of switches (relays)
#ifndef NUM_SWITCHES
#define NUM_SWITCHES (sizeof(relayPins) / sizeof(relayPins[0]))
#endif

// Local switch state array
struct SwitchState {
  int relayGpio;           // Relay control GPIO (output)
  int manualGpio;          // Manual switch GPIO (input)
  bool state;              // Logical ON/OFF state
  bool manualOverride;     // Whether this switch was manually overridden
  bool manualEnabled;      // Whether manual input is active
  bool manualActiveLow;    // Input polarity (true = active low)
  bool manualMomentary;    // true = momentary, false = maintained
  int lastManualLevel;     // Last raw digitalRead level
  unsigned long lastManualChangeMs; // Last time raw level flipped
  int stableManualLevel;   // Debounced level
  bool lastManualActive;   // Previous debounced logical active level
  bool defaultState;       // Default state for offline mode
  int gpio;                // For compatibility with publishState
};
SwitchState switchesLocal[NUM_SWITCHES];

// Command struct for queue
struct Command {
  int gpio;
  bool state;
  bool valid;
  unsigned long timestamp;
};

#define MAX_COMMAND_QUEUE 16
Command commandQueue[MAX_COMMAND_QUEUE];
int commandQueueHead = 0;
int commandQueueTail = 0;

// Timer for periodic state sending
unsigned long lastStateSend = 0;

// --- END GLOBALS ---


// Add a command to the queue
void queueSwitchCommand(int gpio, bool state) {
  int nextTail = (commandQueueTail + 1) % MAX_COMMAND_QUEUE;
  if (nextTail == commandQueueHead) {
    Serial.println("[CMD] Command queue full, dropping command");
    return;
  }
  commandQueue[commandQueueTail] = {gpio, state, true, millis()};
  commandQueueTail = nextTail;
  Serial.printf("[CMD] Queued command: GPIO %d -> %s\n", gpio, state ? "ON" : "OFF");
}

// Process commands in the queue (rate limited)
void processCommandQueue() {
  static unsigned long lastProcess = 0;
  unsigned long now = millis();
  if (now - lastProcess < 10) return; // 10ms interval (reduced from 25ms)
  lastProcess = now;

  int processed = 0;
  while (commandQueueHead != commandQueueTail && processed < 5) {
    Command &cmd = commandQueue[commandQueueHead];
    // Find the switch and apply state
    for (int i = 0; i < NUM_SWITCHES; i++) {
      if (switchesLocal[i].relayGpio == cmd.gpio) {
        switchesLocal[i].state = cmd.state;
        switchesLocal[i].manualOverride = false;
        digitalWrite(switchesLocal[i].relayGpio, cmd.state ? LOW : HIGH);
        switchesLocal[i].gpio = switchesLocal[i].relayGpio; // for publishState
        Serial.printf("[CMD] Relay GPIO %d set to %s (from queue)\n", cmd.gpio, cmd.state ? "ON" : "OFF");
        break;
      }
    }
    commandQueueHead = (commandQueueHead + 1) % MAX_COMMAND_QUEUE;
    processed++;
  }
}





// --- Dynamic config loading/saving ---
void loadSwitchConfigFromNVS() {
  prefs.begin("switch_cfg", true);
  for (int i = 0; i < NUM_SWITCHES; i++) {
    String keyRelay = "relay" + String(i);
    String keyManual = "manual" + String(i);
    String keyDefault = "def" + String(i);
    int relay = prefs.getInt(keyRelay.c_str(), relayPins[i]);
    int manual = prefs.getInt(keyManual.c_str(), manualSwitchPins[i]);
    bool defState = prefs.getBool(keyDefault.c_str(), false);
    switchesLocal[i].relayGpio = relay;
    switchesLocal[i].manualGpio = manual;
    switchesLocal[i].defaultState = defState;
  }
  prefs.end();
  Serial.println("[NVS] Loaded switch config from NVS");
}

void saveSwitchConfigToNVS() {
  prefs.begin("switch_cfg", false);
  for (int i = 0; i < NUM_SWITCHES; i++) {
    String keyRelay = "relay" + String(i);
    String keyManual = "manual" + String(i);
    String keyDefault = "def" + String(i);
    prefs.putInt(keyRelay.c_str(), switchesLocal[i].relayGpio);
    prefs.putInt(keyManual.c_str(), switchesLocal[i].manualGpio);
    prefs.putBool(keyDefault.c_str(), switchesLocal[i].defaultState);
  }
  prefs.end();
  Serial.println("[NVS] Saved switch config to NVS");
}

// Initialize switch state array with mapping, loading from NVS if available
void initSwitches() {
  for (int i = 0; i < NUM_SWITCHES; i++) {
    switchesLocal[i].relayGpio = relayPins[i];
    switchesLocal[i].manualGpio = manualSwitchPins[i];
    switchesLocal[i].state = false;
    switchesLocal[i].manualOverride = false;
    switchesLocal[i].manualEnabled = true;
    switchesLocal[i].manualActiveLow = true;
    switchesLocal[i].manualMomentary = false;
    switchesLocal[i].lastManualLevel = -1;
    switchesLocal[i].lastManualChangeMs = 0;
    switchesLocal[i].stableManualLevel = -1;
    switchesLocal[i].lastManualActive = false;
    switchesLocal[i].defaultState = false;
  }
  loadSwitchConfigFromNVS();
}



// Debounce and manual switch handling constants
#define MANUAL_DEBOUNCE_MS 80
#define MANUAL_REPEAT_IGNORE_MS 200

void handleManualSwitches() {
  unsigned long now = millis();
  for (int i = 0; i < NUM_SWITCHES; i++) {
    SwitchState &sw = switchesLocal[i];
    if (!sw.manualEnabled || sw.manualGpio < 0) continue;

    // Setup pinMode if not already done (first call)
    static bool pinSetup[16] = {false};
    if (!pinSetup[i]) {
      pinMode(sw.manualGpio, INPUT_PULLUP);
      pinMode(sw.relayGpio, OUTPUT);
      digitalWrite(sw.relayGpio, sw.state ? LOW : HIGH); // Active-low relay
      pinSetup[i] = true;
    }

    int rawLevel = digitalRead(sw.manualGpio);
    bool active = sw.manualActiveLow ? (rawLevel == LOW) : (rawLevel == HIGH);

    // Debounce logic
    if (rawLevel != sw.lastManualLevel) {
      sw.lastManualChangeMs = now;
      sw.lastManualLevel = rawLevel;
    }
    if ((now - sw.lastManualChangeMs) > MANUAL_DEBOUNCE_MS && rawLevel != sw.stableManualLevel) {
      sw.stableManualLevel = rawLevel;
      // Only act on edge (momentary) or level (maintained)
      if (sw.manualMomentary) {
        if (active && !sw.lastManualActive && (now - sw.lastManualChangeMs) > MANUAL_REPEAT_IGNORE_MS) {
          // Toggle relay state
          bool prevState = sw.state;
          sw.state = !sw.state;
          sw.manualOverride = true;
          digitalWrite(sw.relayGpio, sw.state ? LOW : HIGH);
          Serial.printf("[MANUAL] Momentary: Relay GPIO %d toggled to %s\n", sw.relayGpio, sw.state ? "ON" : "OFF");
          // Send manual switch event for logging
          if (mqttClient.connected()) {
            publishManualSwitchEvent(sw.relayGpio, sw.state);
          }
          // Buffer event if offline
          if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) {
            queueOfflineEvent(sw.relayGpio, prevState, sw.state);
          }
          // Send immediate state update for UI
          sendStateUpdate(true);
        }
      } else {
        // Maintained: switch state follows manual input
        bool newState = active;
        if (sw.state != newState) {
          bool prevState = sw.state;
          sw.state = newState;
          sw.manualOverride = true;
          digitalWrite(sw.relayGpio, sw.state ? LOW : HIGH);
          Serial.printf("[MANUAL] Maintained: Relay GPIO %d set to %s\n", sw.relayGpio, sw.state ? "ON" : "OFF");
          // Send manual switch event for logging
          if (mqttClient.connected()) {
            publishManualSwitchEvent(sw.relayGpio, sw.state);
          }
          // Buffer event if offline
          if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) {
            queueOfflineEvent(sw.relayGpio, prevState, sw.state);
          }
          // Send immediate state update for UI
          sendStateUpdate(true);
        }
      }
      sw.lastManualActive = active;
    }
  }
}


// --- Heartbeat logic ---
void sendHeartbeat() {
  static unsigned long lastHeartbeat = 0;
  unsigned long now = millis();
  if (now - lastHeartbeat < 10000) return; // 10s interval
  lastHeartbeat = now;
  DynamicJsonDocument doc(128);
  doc["mac"] = WiFi.macAddress();
  doc["status"] = "heartbeat";
  doc["heap"] = ESP.getFreeHeap();
  char buf[128];
  size_t n = serializeJson(doc, buf);
  mqttClient.publish(TELEMETRY_TOPIC, buf, n);
  Serial.println("[HEARTBEAT] Sent heartbeat telemetry");
}



bool pendingState = false;

void checkSystemHealth() {
  static unsigned long lastHealthCheck = 0;
  unsigned long now = millis();
  if (now - lastHealthCheck < 10000) return; // 10s interval
  lastHealthCheck = now;

  // Heap monitoring
  size_t freeHeap = ESP.getFreeHeap();
#if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(2,0,0)
  size_t minFreeHeap = ESP.getMinFreeHeap();
#else
  size_t minFreeHeap = 0;
#endif
  Serial.printf("[HEALTH] Heap: %u bytes free, Min: %u\n", freeHeap, minFreeHeap);
  if (freeHeap < 20000) {
    Serial.printf("[CRITICAL] Very low heap memory: %u bytes free!\n", freeHeap);
  }

  // Command queue monitoring
  int queueItems = (commandQueueTail - commandQueueHead + MAX_COMMAND_QUEUE) % MAX_COMMAND_QUEUE;
  if (queueItems > MAX_COMMAND_QUEUE / 2) {
    Serial.printf("[WARNING] Command queue backing up: %d/%d items\n", queueItems, MAX_COMMAND_QUEUE);
  }

  // Switch state summary
  int activeSwitches = 0;
  for (int i = 0; i < NUM_SWITCHES; i++) {
    if (switchesLocal[i].state) activeSwitches++;
  }
  Serial.printf("[HEALTH] Active switches: %d/%d\n", activeSwitches, NUM_SWITCHES);
}
// --- END: Stubs for missing functions/variables ---

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    connState = WIFI_ONLY;
  } else {
    Serial.println("\nWiFi connection failed, running in offline mode");
    connState = WIFI_DISCONNECTED;
  }
}

void reconnect_mqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD)) {
      Serial.println("connected");
  mqttClient.subscribe(SWITCH_TOPIC);
  // Publish online status to both telemetry and state topics, including MAC address
  String mac = WiFi.macAddress();
  String onlinePayload = String("{\"mac\":\"") + mac + String("\",\"status\":\"online\"}");
  mqttClient.publish(TELEMETRY_TOPIC, onlinePayload.c_str());
  mqttClient.publish(STATE_TOPIC, onlinePayload.c_str());
  sendStateUpdate(true); // Send initial state
  sendQueuedOfflineEvents();
  connState = BACKEND_CONNECTED;
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      connState = WIFI_ONLY;
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  Serial.printf("[MQTT] Message arrived [%s]: %s\n", topic, message.c_str());
  if (String(topic) == SWITCH_TOPIC) {
    // Parse command: expected format "relay1:on" or JSON {gpio,state}
    if (message.startsWith("{")) {
      DynamicJsonDocument doc(256);
      DeserializationError err = deserializeJson(doc, message);
      if (!err && doc["gpio"].is<int>() && doc["state"].is<bool>()) {
        int gpio = doc["gpio"];
        bool state = doc["state"];
        queueSwitchCommand(gpio, state);
        processCommandQueue();
      }
    } else {
      int colon = message.indexOf(':');
      if (colon > 0) {
        String relay = message.substring(0, colon);
        String stateStr = message.substring(colon + 1);
        bool state = (stateStr == "on");
        // Map relay name to GPIO (implement mapping as needed)
        int gpio = relayNameToGpio(relay.c_str());
        if (gpio >= 0) {
          queueSwitchCommand(gpio, state);
          processCommandQueue();
        }
      }
    }
  }
}

void publishState() {
  DynamicJsonDocument doc(1024);
  doc["mac"] = WiFi.macAddress();
  JsonArray arr = doc.createNestedArray("switches");
  for (int i = 0; i < NUM_SWITCHES; i++) {
    JsonObject o = arr.createNestedObject();
    o["gpio"] = switchesLocal[i].relayGpio;
    o["state"] = switchesLocal[i].state;
    o["manual_override"] = switchesLocal[i].manualOverride;
  }
  char buf[1024];
  size_t n = serializeJson(doc, buf);
  mqttClient.publish(STATE_TOPIC, buf, n);
  Serial.println("[MQTT] Published state update");
}

// Publish manual switch event for logging
void publishManualSwitchEvent(int gpio, bool state) {
  DynamicJsonDocument doc(128);
  doc["mac"] = WiFi.macAddress();
  doc["type"] = "manual_switch";
  doc["gpio"] = gpio;
  doc["state"] = state;
  doc["timestamp"] = millis();
  char buf[128];
  size_t n = serializeJson(doc, buf);
  mqttClient.publish(TELEMETRY_TOPIC, buf, n);
  Serial.printf("[MQTT] Published manual switch event: GPIO %d -> %s\n", gpio, state ? "ON" : "OFF");
}

// Replace sendStateUpdate(bool force) to call publishState() when needed

// --- State update debounce logic ---
void sendStateUpdate(bool force) {
  static unsigned long lastStateSent = 0;
  static uint32_t lastStateHash = 0;
  unsigned long now = millis();
  // Compute a simple hash of switch states
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



// Map relay name to GPIO (implement as needed)
int relayNameToGpio(const char* relay) {
  // Example: "relay1" -> 16, "relay2" -> 17, etc.
  if (strcmp(relay, "relay1") == 0) return 16;
  if (strcmp(relay, "relay2") == 0) return 17;
  if (strcmp(relay, "relay3") == 0) return 18;
  if (strcmp(relay, "relay4") == 0) return 19;
  if (strcmp(relay, "relay5") == 0) return 21;
  if (strcmp(relay, "relay6") == 0) return 22;
  return -1;
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP32 Classroom Automation System (MQTT)");
  // Register main task with watchdog (10s timeout, panic on trigger)
#if defined(ESP_IDF_VERSION)
  // ESP-IDF style (if available)
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 10000,
    .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
#else
  // For Arduino-ESP32 3.x, just add the task (init is done by core)
#endif
  esp_task_wdt_add(NULL);
  // Initialize switches with relay/manual mapping
  initSwitches();
  // Load any queued offline events from previous sessions
  loadOfflineEventsFromNVS();
  // ...existing setup code for relays, NVS, offline events, etc...
  setup_wifi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512); // Increase buffer size for larger state messages
  mqttClient.setCallback(mqttCallback);
  // ...existing code for watchdog, relays, etc...
}

void loop() {
  esp_task_wdt_reset();
  // Always allow manual switches to work, even if offline
  handleManualSwitches();
  // Periodic state update to keep backend informed
  if (millis() - lastStateSend > 5000) { // 5 seconds (reduced from 30s)
    sendStateUpdate(true);
    lastStateSend = millis();
  }
  // If not connected to MQTT, try to reconnect
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) reconnect_mqtt();
    mqttClient.loop();
    processCommandQueue();
    sendHeartbeat();
    blinkStatus();
    if (pendingState) sendStateUpdate(false);
    checkSystemHealth();
  }
  delay(10);
}

// ...all other advanced features, NVS, offline buffer, error handling, etc. remain unchanged...
