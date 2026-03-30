#include <WiFi.h>
#include <PubSubClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ESP32Servo.h>
#include <Preferences.h>
#include <ArduinoJson.h>

// ========== CONFIG ==========
const char* WIFI_SSID = "Ahmad";
const char* WIFI_PASSWORD = "Ahmad123";

const char* MQTT_SERVER = "broker.emqx.io";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "smartfishf1";

// MQTT topics
const char* TOPIC_LEVEL = "feed/level";
const char* TOPIC_LAST  = "feed/last";
const char* TOPIC_STATUS= "feed/status";
const char* TOPIC_MANUAL= "feed/manual";

// Pins
const int PIN_TRIG = 5;
const int PIN_ECHO = 18;
const int PIN_SERVO = 13;

// Container dimensions / calibration (cm)
const float DIST_FULL = 3.0;
const float DIST_EMPTY = 20.0;

const unsigned long MEASURE_INTERVAL = 15000UL;
const unsigned long PUB_INTERVAL = 30000UL;
const unsigned long FEED_DURATION_MS = 1500UL;

// ========== GLOBALS ==========
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 7 * 3600, 60000);

Preferences prefs;
Servo feederServo;

unsigned long lastMeasure = 0;
unsigned long lastPublish = 0;
float lastLevelPercent = -1;
String lastFeedTime = "";
String statusStr = "IDLE";
unsigned long lastReconnectAttempt = 0;

// ========== FUNCTIONS ==========
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to WiFi ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000UL) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect failed");
  }
}

bool mqttConnect() {
  if (mqtt.connected()) return true;
  Serial.print("Connecting to MQTT...");
  if (mqtt.connect(MQTT_CLIENT_ID)) {
    Serial.println("connected");
    mqtt.subscribe(TOPIC_MANUAL);
    return true;
  } else {
    Serial.print("failed, rc=");
    Serial.print(mqtt.state());
    Serial.println(" try again in 5s");
    return false;
  }
}

long measureDistanceCM() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long duration = pulseIn(PIN_ECHO, HIGH, 30000);
  if (duration == 0) return -1;
  float distance = (duration / 2.0) / 29.1;
  return (long)distance;
}

float distanceToPercent(float distance) {
  if (distance < DIST_FULL) distance = DIST_FULL;
  if (distance > DIST_EMPTY) distance = DIST_EMPTY;
  float p = 100.0f * (1.0f - (distance - DIST_FULL) / (DIST_EMPTY - DIST_FULL));
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  return p;
}

void publishJSON(const char* topic, JsonDocument& doc) {
  char buffer[256];
  size_t n = serializeJson(doc, buffer);
  mqtt.publish(topic, buffer, n);
}

void publishLevel(float percent) {
  StaticJsonDocument<64> doc;
  doc["level"] = percent;
  publishJSON(TOPIC_LEVEL, doc);
}

void publishStatus(const String& status) {
  StaticJsonDocument<64> doc;
  doc["status"] = status;
  publishJSON(TOPIC_STATUS, doc);
}

void publishLastFeed(const String& time) {
  StaticJsonDocument<128> doc;
  doc["last_feed"] = time;
  publishJSON(TOPIC_LAST, doc);
}

void doFeed(const char* mode) {
  Serial.printf("Feeding triggered (%s)\n", mode);
  statusStr = (String)"FEEDING_" + String(mode);
  publishStatus(statusStr);

  feederServo.write(90);
  delay(FEED_DURATION_MS);
  feederServo.write(0);
  delay(300);

  timeClient.update();
  time_t epoch = timeClient.getEpochTime();
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", localtime(&epoch));
  lastFeedTime = String(buf);
  prefs.putString("last_feed_time", lastFeedTime);

  publishLastFeed(lastFeedTime);
  statusStr = "IDLE";
  publishStatus(statusStr);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String jsonStr;
  for (unsigned int i = 0; i < length; i++) jsonStr += (char)payload[i];
  Serial.printf("MQTT Message [%s]: %s\n", topic, jsonStr.c_str());

  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) {
    Serial.println("JSON parse error");
    return;
  }

  if (String(topic) == TOPIC_MANUAL) {
    const char* cmd = doc["command"];
    if (cmd && (strcmp(cmd, "ON") == 0 || strcmp(cmd, "FEED") == 0)) {
      doFeed("MANUAL");
    } else {
      Serial.println("Unknown manual command");
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 Fish Feeder JSON starting...");

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);

  feederServo.setPeriodHertz(50);
  feederServo.attach(PIN_SERVO, 500, 2400);
  feederServo.write(0);

  prefs.begin("feeder", false);
  lastFeedTime = prefs.getString("last_feed_time", "");
  Serial.print("Loaded last feed time: ");
  Serial.println(lastFeedTime);

  connectWiFi();
  timeClient.begin();
  timeClient.update();

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);

  publishStatus(statusStr);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (mqttConnect()) lastReconnectAttempt = 0;
    }
  } else mqtt.loop();

  unsigned long now = millis();

  if (now - lastMeasure >= MEASURE_INTERVAL) {
    lastMeasure = now;
    long d = measureDistanceCM();
    if (d > 0) {
      lastLevelPercent = distanceToPercent((float)d);
      Serial.printf("Distance: %ld cm -> Level: %.1f%%\n", d, lastLevelPercent);
    }
  }

  if (now - lastPublish >= PUB_INTERVAL) {
    lastPublish = now;
    if (mqtt.connected()) {
      if (lastLevelPercent >= 0) publishLevel(lastLevelPercent);
      if (lastFeedTime.length() > 0) publishLastFeed(lastFeedTime);
      publishStatus(statusStr);
    }
  }

  // Auto feed schedule
  timeClient.update();
  String current = timeClient.getFormattedTime();
  int hh = atoi(current.substring(0,2).c_str());
  int mm = atoi(current.substring(3,5).c_str());

  static bool fedMorning = false;
  static bool fedEvening = false;
  static int lastDay = -1;

  time_t epoch = timeClient.getEpochTime();
  struct tm *tm_ptr = localtime(&epoch);
  int today = tm_ptr->tm_mday;
  if (lastDay != today) {
    fedMorning = false;
    fedEvening = false;
    lastDay = today;
  }

  if (hh == 7 && mm == 0 && !fedMorning) {
    doFeed("AUTO");
    fedMorning = true;
  }
  if (hh == 17 && mm == 30 && !fedEvening) {
    doFeed("AUTO");
    fedEvening = true;
  }

  delay(20);
}
