/**
 * QueueFlow ESP32 Worker Button
 * 
 * Hardware:
 *   - ESP32 Dev Board
 *   - Push button: GPIO 4 → GND (using INPUT_PULLUP)
 *   - Status LED: GPIO 2 (built-in)
 *   - Optional buzzer: GPIO 5
 * 
 * When button pressed → calls backend API → marks order ready
 * LED blinks to confirm successful API call
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─── Configuration ──────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASS     = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://your-backend.onrender.com";
const char* ESP32_API_KEY = "your_esp32_api_key_here";

// ─── Pin Definitions ─────────────────────────────────────────────────────────
#define BUTTON_PIN  4
#define LED_PIN     2
#define BUZZER_PIN  5

// ─── State ───────────────────────────────────────────────────────────────────
bool lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 50;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30s

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);

  connectWiFi();
  Serial.println("✅ QueueFlow ESP32 ready");
  blinkLED(3, 100); // startup confirmation
}

void loop() {
  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    connectWiFi();
  }

  // Read button with debounce
  bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    if (reading == LOW) { // button pressed (active low with pullup)
      Serial.println("🔘 Button pressed — calling API...");
      bool success = callButtonPressAPI();
      if (success) {
        blinkLED(2, 200);
        beepBuzzer(2, 150);
      } else {
        blinkLED(5, 80); // fast blink = error
      }
      delay(500); // prevent double-press
    }
  }
  lastButtonState = reading;

  // Heartbeat ping
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    pingServer();
    lastHeartbeat = millis();
  }
}

bool callButtonPressAPI() {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/iot/button-press";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp32-api-key", ESP32_API_KEY);
  http.setTimeout(8000);

  StaticJsonDocument<128> doc;
  doc["workerId"] = "esp32-station-1";
  doc["timestamp"] = millis();
  
  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.printf("API response [%d]: %s\n", httpCode, response.c_str());
  return (httpCode == 200);
}

void pingServer() {
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/iot/status";
  http.begin(url);
  http.addHeader("x-esp32-api-key", ESP32_API_KEY);
  http.setTimeout(5000);
  int code = http.GET();
  http.end();
  Serial.printf("Heartbeat: %d\n", code);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected: " + WiFi.localIP().toString());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n❌ WiFi failed — running offline");
    digitalWrite(LED_PIN, LOW);
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
  digitalWrite(LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
}

void beepBuzzer(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(delayMs);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}
