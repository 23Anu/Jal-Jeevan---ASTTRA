/*
  ================================================================================
  Smart Water Purification & Quality Monitoring System - ESP32 IoT Node
  SIH26040 - Department of Drinking Water & Sanitation, Govt. of Jharkhand
  ================================================================================

  Architecture:
  ESP32 Sensors -> Wi-Fi -> Node.js/Express REST API -> MongoDB Atlas -> Web Portal

  Sensor Pin Connections:
  - Analog Pin 34 (ADC1_CH6): Analog pH Sensor (0-14 pH)
  - Analog Pin 35 (ADC1_CH7): Gravity Analog TDS Sensor (0-1000 ppm)
  - Analog Pin 32 (ADC1_CH4): Optical Turbidity Sensor (0-1000 NTU)
  - Digital Pin 4  (GPIO4)  : DS18B20 OneWire Temperature Sensor
  - Built-in LED   (GPIO2)  : Wi-Fi / Telemetry Transmission Indicator

  Required Arduino Libraries:
  - WiFi.h (Built-in ESP32)
  - HTTPClient.h (Built-in ESP32)
  - ArduinoJson.h (v6.x or v7.x by Benoit Blanchon)
  - OneWire.h (by Paul Stoffregen)
  - DallasTemperature.h (by Miles Burton)
  ================================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ==========================================
// 1. NETWORK & API CONFIGURATION
// ==========================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";         // Replace with your Wi-Fi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // Replace with your Wi-Fi password

// Backend API URL (Replace with your server's IP / Domain)
// For local testing on same Wi-Fi: "http://10.229.27.187:5000/api/water-data"
// For cloud deployed server: "https://your-app.onrender.com/api/water-data"
const char* SERVER_URL    = "http://10.229.27.187:5000/api/water-data";

const char* DEVICE_ID     = "ESP32_001";              // Unique Station ID
const unsigned long SEND_INTERVAL_MS = 5000;          // Send telemetry every 5 seconds

// ==========================================
// 2. SENSOR PINS & CALIBRATION CONSTANTS
// ==========================================
#define PIN_PH          34
#define PIN_TDS         35
#define PIN_TURBIDITY   32
#define PIN_TEMP_BUS    4
#define PIN_STATUS_LED  2

#define ADC_REF_VOLTAGE 3.3
#define ADC_RESOLUTION  4095.0

// OneWire setup for DS18B20 Temperature sensor
OneWire oneWire(PIN_TEMP_BUS);
DallasTemperature tempSensor(&oneWire);

unsigned long lastSendTime = 0;

// ==========================================
// 3. SENSOR READING FUNCTIONS
// ==========================================

// Read average analog voltage with oversampling
float readAnalogVoltage(int pin, int samples = 20) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  float avgAdc = sum / (float)samples;
  return (avgAdc / ADC_RESOLUTION) * ADC_REF_VOLTAGE;
}

// 1. Read pH value (Standard Gravity pH Sensor Curve: pH = 7.0 + (MidVoltage - V) / Slope)
float getPhValue() {
  float voltage = readAnalogVoltage(PIN_PH);
  // Calibration: 2.5V corresponds to pH 7.0 neutral buffer
  float ph = 7.00 + ((2.50 - voltage) * 3.50);
  if (ph < 0.0) ph = 0.0;
  if (ph > 14.0) ph = 14.0;
  return ph;
}

// 2. Read TDS value (in ppm / mg/L with temperature compensation)
float getTdsValue(float temperature) {
  float voltage = readAnalogVoltage(PIN_TDS);
  // Temperature compensation formula
  float compensationCoefficient = 1.0 + 0.02 * (temperature - 25.0);
  float compensationVoltage = voltage / compensationCoefficient;
  // Convert voltage to TDS ppm value
  float tds = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5;
  if (tds < 0.0) tds = 0.0;
  return tds;
}

// 3. Read Turbidity (in NTU)
float getTurbidityValue() {
  float voltage = readAnalogVoltage(PIN_TURBIDITY);
  float turbidity = 0.0;
  if (voltage < 2.5) {
    turbidity = 3000.0; // High turbidity
  } else if (voltage > 4.2) {
    turbidity = 0.0;    // Clear water
  } else {
    turbidity = -1120.4 * pow(voltage, 2) + 5742.3 * voltage - 4353.8;
  }
  if (turbidity < 0.0) turbidity = 0.0;
  return turbidity;
}

// 4. Read Temperature (°C) from DS18B20
float getTemperatureValue() {
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  // Fallback to 25.0°C if sensor is disconnected (DS18B20 returns -127 on error)
  if (tempC < -50.0 || tempC > 100.0) {
    tempC = 25.4;
  }
  return tempC;
}

// ==========================================
// 4. WI-FI MANAGEMENT
// ==========================================
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("\n📡 [Wi-Fi] Connecting to network: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ [Wi-Fi] Connected successfully!");
    Serial.println("🌐 [Wi-Fi] IP Address: " + WiFi.localIP().toString());
    digitalWrite(PIN_STATUS_LED, HIGH);
  } else {
    Serial.println("\n❌ [Wi-Fi] Connection failed. Retrying in next cycle...");
    digitalWrite(PIN_STATUS_LED, LOW);
  }
}

// ==========================================
// 5. POST TELEMETRY TO NODE.JS / MONGODB API
// ==========================================
void sendWaterTelemetry(float ph, float tds, float turbidity, float temp) {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Create JSON document
  StaticJsonDocument<256> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["ph"]          = serialized(String(ph, 2));
  doc["tds"]         = (int)round(tds);
  doc["turbidity"]   = serialized(String(turbidity, 2));
  doc["temperature"] = serialized(String(temp, 1));

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("\n📤 [HTTP POST] Sending payload to: " + String(SERVER_URL));
  Serial.println("📄 [Payload]: " + requestBody);

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("📥 [Response " + String(httpResponseCode) + "]: " + response);

    if (httpResponseCode == 201 || httpResponseCode == 200) {
      Serial.println("✅ [Success] Telemetry stored in MongoDB Atlas!");
    } else {
      Serial.println("⚠️ [Warning] Server responded with code: " + String(httpResponseCode));
    }
  } else {
    Serial.println("❌ [HTTP Error]: Failed to connect to server. Error code: " + String(httpResponseCode));
    Serial.println("ℹ️ [Tip] Check if Node.js server is running and accessible on the network.");
  }

  http.end();
}

// ==========================================
// 6. SETUP & MAIN LOOP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("🚀 ASTTRA Water Purification & Quality Monitoring IoT Node");
  Serial.println("📍 Device ID: " + String(DEVICE_ID));
  Serial.println("========================================================");

  pinMode(PIN_STATUS_LED, OUTPUT);
  analogReadResolution(12); // 12-bit ADC (0-4095)
  
  tempSensor.begin();
  connectToWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  // Transmit telemetry periodically
  if (currentMillis - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = currentMillis;

    // 1. Read all sensor values
    float temperature = getTemperatureValue();
    float ph = getPhValue();
    float tds = getTdsValue(temperature);
    float turbidity = getTurbidityValue();

    Serial.println("\n------------------------------------------------");
    Serial.printf("📊 [Sensors] pH: %.2f | TDS: %.0f ppm | Turb: %.2f NTU | Temp: %.1f °C\n", ph, tds, turbidity, temperature);

    // 2. Transmit via HTTP POST to REST API
    sendWaterTelemetry(ph, tds, turbidity, temperature);
  }

  delay(100);
}
