/*
 * ============================================================
 * SMART DUSTBIN - Embedded Systems Project
 * ============================================================
 * Hardware:
 *   - Arduino UNO
 *   - HC-SR04 Ultrasonic Sensor 1 (Hand Detection)
 *   - HC-SR04 Ultrasonic Sensor 2 (Bin Level Detection)
 *   - Servo Motor (Lid Control)
 *   - Green LED (Bin OK)
 *   - Red LED (Bin Full)
 *   - Buzzer (Alert)
 * ============================================================
 */

#include <Servo.h>

// ── Pin Definitions ──────────────────────────────────────────
// Ultrasonic Sensor 1 — Hand Detection
#define HAND_TRIG    2
#define HAND_ECHO    3

// Ultrasonic Sensor 2 — Bin Level Detection
#define LEVEL_TRIG   4
#define LEVEL_ECHO   5

// Servo Motor
#define SERVO_PIN    9

// LED Indicators
#define GREEN_LED    7
#define RED_LED      8

// Buzzer
#define BUZZER       6

// ── Threshold Values ─────────────────────────────────────────
#define HAND_DETECT_CM     15   // Hand within 15cm opens lid
#define BIN_FULL_CM        10   // Bin full when waste < 10cm
#define BIN_MEDIUM_CM      20   // Bin medium when waste < 20cm
#define BIN_HEIGHT_CM      30   // Total bin height in cm

// ── Servo Angles ─────────────────────────────────────────────
#define LID_OPEN_ANGLE     90   // Lid open position
#define LID_CLOSE_ANGLE     0   // Lid closed position

// ── Timing ───────────────────────────────────────────────────
#define LID_OPEN_DELAY   3000   // Keep lid open 3 seconds
#define BUZZER_FREQ       500   // Buzzer frequency Hz
#define BUZZER_DURATION   200   // Buzzer beep duration ms

// ── Objects ──────────────────────────────────────────────────
Servo lidServo;

// ── State Variables ──────────────────────────────────────────
bool lidOpen        = false;
unsigned long lidOpenTime = 0;
int  lastBinLevel   = 0;


// ════════════════════════════════════════════════════════════
// SETUP
// ════════════════════════════════════════════════════════════
void setup() {
    Serial.begin(9600);
    Serial.println("====================================");
    Serial.println("  SMART DUSTBIN SYSTEM STARTING...");
    Serial.println("====================================");

    // Sensor pins
    pinMode(HAND_TRIG,  OUTPUT);
    pinMode(HAND_ECHO,  INPUT);
    pinMode(LEVEL_TRIG, OUTPUT);
    pinMode(LEVEL_ECHO, INPUT);

    // Output pins
    pinMode(GREEN_LED, OUTPUT);
    pinMode(RED_LED,   OUTPUT);
    pinMode(BUZZER,    OUTPUT);

    // Servo
    lidServo.attach(SERVO_PIN);
    lidServo.write(LID_CLOSE_ANGLE);

    // Startup indication
    digitalWrite(GREEN_LED, HIGH);
    delay(500);
    digitalWrite(GREEN_LED, LOW);
    delay(500);
    digitalWrite(GREEN_LED, HIGH);

    Serial.println("System Ready!");
    Serial.println("------------------------------------");
}


// ════════════════════════════════════════════════════════════
// MAIN LOOP
// ════════════════════════════════════════════════════════════
void loop() {

    // 1. Read hand distance
    float handDist  = readUltrasonic(HAND_TRIG, HAND_ECHO);

    // 2. Read bin level distance
    float levelDist = readUltrasonic(LEVEL_TRIG, LEVEL_ECHO);

    // 3. Calculate bin fill percentage
    int fillPercent = calculateFillPercent(levelDist);

    // 4. Print to serial monitor
    printStatus(handDist, levelDist, fillPercent);

    // 5. Handle lid control
    handleLid(handDist, fillPercent);

    // 6. Handle LED indicators
    handleLEDs(fillPercent);

    // 7. Handle buzzer alert
    handleBuzzer(fillPercent);

    delay(200);
}


// ════════════════════════════════════════════════════════════
// READ ULTRASONIC SENSOR
// ════════════════════════════════════════════════════════════
float readUltrasonic(int trigPin, int echoPin) {
    // Send trigger pulse
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    // Read echo duration
    long duration = pulseIn(echoPin, HIGH, 30000);

    // Convert to cm
    float distance = (duration * 0.034) / 2.0;

    // Return valid range
    if (distance <= 0 || distance > 400) {
        return 999;
    }
    return distance;
}


// ════════════════════════════════════════════════════════════
// CALCULATE BIN FILL PERCENTAGE
// ════════════════════════════════════════════════════════════
int calculateFillPercent(float levelDist) {
    if (levelDist >= BIN_HEIGHT_CM) return 0;
    if (levelDist <= 0)             return 100;

    int percent = (int)(
        (1.0 - (levelDist / BIN_HEIGHT_CM)) * 100
    );
    return constrain(percent, 0, 100);
}


// ════════════════════════════════════════════════════════════
// HANDLE LID CONTROL
// ════════════════════════════════════════════════════════════
void handleLid(float handDist, int fillPercent) {

    // Don't open if bin is full
    if (fillPercent >= 100) {
        closeLid();
        return;
    }

    // Open lid if hand detected
    if (handDist < HAND_DETECT_CM && handDist > 0) {
        openLid();
        lidOpenTime = millis();
    }

    // Close lid after delay
    if (lidOpen &&
        millis() - lidOpenTime > LID_OPEN_DELAY) {
        closeLid();
    }
}


// ════════════════════════════════════════════════════════════
// OPEN LID
// ════════════════════════════════════════════════════════════
void openLid() {
    if (!lidOpen) {
        lidServo.write(LID_OPEN_ANGLE);
        lidOpen = true;
        Serial.println(">> LID OPENED");
    }
}


// ════════════════════════════════════════════════════════════
// CLOSE LID
// ════════════════════════════════════════════════════════════
void closeLid() {
    if (lidOpen) {
        lidServo.write(LID_CLOSE_ANGLE);
        lidOpen = false;
        Serial.println(">> LID CLOSED");
    }
}


// ════════════════════════════════════════════════════════════
// HANDLE LED INDICATORS
// ════════════════════════════════════════════════════════════
void handleLEDs(int fillPercent) {
    if (fillPercent >= 90) {
        // Bin full — RED on, GREEN off
        digitalWrite(RED_LED,   HIGH);
        digitalWrite(GREEN_LED, LOW);
    } else if (fillPercent >= 60) {
        // Bin medium — both blink
        digitalWrite(RED_LED,   HIGH);
        digitalWrite(GREEN_LED, LOW);
        delay(100);
        digitalWrite(RED_LED,   LOW);
        delay(100);
    } else {
        // Bin OK — GREEN on, RED off
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(RED_LED,   LOW);
    }
}


// ════════════════════════════════════════════════════════════
// HANDLE BUZZER ALERT
// ════════════════════════════════════════════════════════════
void handleBuzzer(int fillPercent) {
    if (fillPercent >= 90) {
        // Continuous beep when full
        tone(BUZZER, BUZZER_FREQ, BUZZER_DURATION);
        delay(BUZZER_DURATION);
        noTone(BUZZER);
        delay(300);
    }
}


// ════════════════════════════════════════════════════════════
// PRINT STATUS TO SERIAL MONITOR
// ════════════════════════════════════════════════════════════
void printStatus(float hand,
                 float level,
                 int   fill) {

    Serial.print("Hand: ");
    Serial.print(hand);
    Serial.print(" cm | Level: ");
    Serial.print(level);
    Serial.print(" cm | Fill: ");
    Serial.print(fill);
    Serial.print("% | Lid: ");
    Serial.print(lidOpen ? "OPEN" : "CLOSED");
    Serial.print(" | Status: ");

    if      (fill >= 90) Serial.println("BIN FULL!");
    else if (fill >= 60) Serial.println("BIN MEDIUM");
    else                 Serial.println("BIN OK");
}