
#include <Thread.h>
#include <ThreadController.h>
#include <Arduino.h>
#include <U8g2lib.h>
#include <DFRobot_Heartrate.h>
#include "BluetoothSerial.h"
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define heartratePin 36
#include "DFRobot_Heartrate.h"

#define SERVICE_UUID "bcb9dcf3-7206-44b4-a4ab-470aeb9b19ee"
#define CHARACTERISTIC_UUID "6e4aa076-b3c3-4ce3-b78d-0c4e092640f4"
#define CHARACTERISTIC_SENSOR_A "9b35563b-bde8-4b94-92c4-b687725c3b9a"
#define CHARACTERISTIC_ACCELEROMETER "9b35563b-bde8-4b94-92c4-b687725c3b9b"

U8G2_SSD1306_128X64_NONAME_F_SW_I2C u8g2(U8G2_R0, /* clock=*/32, /* data=*/33, /* reset=*/U8X8_PIN_NONE); // All Boards without Reset of the Display
DFRobot_Heartrate heartrate(ANALOG_MODE); ///< ANALOG_MODE or DIGITAL_MODE
//
Thread heartrateThread = Thread();
//Thread accelerometerThread = Thread();

BLEServer *pServer;
BLEService *pService;
BLECharacteristic *pCharacteristicSensorA;
BLECharacteristic *pCharacteristicAccelerometer;

int attempts = 1600;
int currentAttempt = 0;
int checkAttempt = 800;
int lastRead = -1;

std::string device_host = "";

Thread bluetoothThread = Thread();

boolean deviceConnected = false;
boolean updateScreen = false;
boolean isWritten = false;

// ------------------- Callback ---------------------
class myServerCallback : public BLEServerCallbacks
{

  void onConnect(BLEServer *pServer, esp_ble_gatts_cb_param_t *param)
  {

    char remoteAddress[18];

    sprintf(
        remoteAddress,
        "%.2X:%.2X:%.2X:%.2X:%.2X:%.2X",
        param->connect.remote_bda[0],
        param->connect.remote_bda[1],
        param->connect.remote_bda[2],
        param->connect.remote_bda[3],
        param->connect.remote_bda[4],
        param->connect.remote_bda[5]);
    Serial.println("CONNECTED");
    Serial.println(remoteAddress);
    deviceConnected = true;
    device_host = "";
    device_host+= remoteAddress;
  }

  void onDisconnect(BLEServer *pServer)
  {
    Serial.println("DISCONNECTED:");
    deviceConnected = false;
//    device_host = "";
  }
};

// ----------------------------------------------------

// --------------------- Main -------------------------

void setup() {
  Serial.begin(115200);
  
  u8g2.begin();
  Serial.println("[BOOT]");
  Serial.println("PROJECT X - NICA");
  Serial.println("Coded by: Roland Kim Andre G. Solon");
  Serial.println("For: Team Nica ITP");
  Serial.println("solon.rolandkimandre@gmail.com");
  /* Declare PINs as input/output */
  u8g2.clearBuffer();              // clear the internal memory
  u8g2.setFont(u8g2_font_6x12_te); // choose a suitable font
  u8g2.drawStr(2, 8, "[BOOT]");    // write something to the internal memory
  u8g2.drawStr(2, 17, "PROJECT_NICA");
  u8g2.sendBuffer(); // transfer internal memory to the display

BLEDevice::init("NICA_PROJECT-BETA");
  pServer = BLEDevice::createServer();
  pService = pServer->createService(SERVICE_UUID);

  //WELCOME MESSAGE
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_NOTIFY);
  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setValue("NICA TEST SENSOR 1");

  pCharacteristicSensorA = pService->createCharacteristic(
      CHARACTERISTIC_SENSOR_A,
      BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  pCharacteristicSensorA->addDescriptor(new BLE2902());
  pCharacteristicSensorA->setValue("0");

  pCharacteristicAccelerometer = pService->createCharacteristic(
      CHARACTERISTIC_ACCELEROMETER,
      BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  pCharacteristicAccelerometer->addDescriptor(new BLE2902());
  pCharacteristicAccelerometer->setValue("0");

  pService->start();
  // BLEAdvertising *pAdvertising = pServer->getAdvertising();  // this still is working for backward compatibility
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // functions that help with iPhone connections issue
  pAdvertising->setMinPreferred(0x12);
  pServer->setCallbacks(new myServerCallback());
  BLEDevice::startAdvertising();

  u8g2.clearDisplay();
  writeScreen(1, "BTLE_MODE");

  bluetoothThread.enabled = true;
  bluetoothThread.setInterval(1000);
  bluetoothThread.onRun(bluetoothChecker);

  heartrateThread.enabled = true;
  heartrateThread.setInterval(1000);
  heartrateThread.onRun(heartChecker);

  interrupts();
}

bool lossText=false;
bool returnText = false;
bool stabilizeText = false;

void loop() {
  Serial.print("RAW:");
  Serial.println(analogRead(heartratePin));
  if(analogRead(heartratePin) < 800){
    if(!lossText){
      writeScreen(4, "Lost Contact");
      lossText=true;
      returnText=false;
      stabilizeText=false;
    }
    
  }
  else if(analogRead(heartratePin)>800){

    if(lastRead==0){
          if(!returnText){
          writeScreen(4, "Reading...");
          lossText=false;
          returnText=true;
          stabilizeText=false;
    }else if(lastRead>0){
      if(!stabilizeText){
        writeScreen(4, "          ");
          lossText=false;
          returnText=true;
          stabilizeText=true;
      }
    }
    }

  }
  
  heartChecker();
//  bluetoothChecker();
  Serial.println("");
//  bluetoothChecker();
//if(heartrateThread.shouldRun()){
//  heartrateThread.run();
//}
if(bluetoothThread.shouldRun())
  bluetoothThread.run();

  delay(10);
}

void heartChecker()
{
  uint8_t rateValue;
  heartrate.getValue(heartratePin); ///< A1 foot sampled values
  rateValue = heartrate.getRate();  ///< Get heart rate value
  if (rateValue)
  {
    char wtf = rateValue;
    Serial.println(rateValue);
    String toSend = "[O]HR:";
    toSend += rateValue;
    writeScreen(3, toSend);
    isWritten=false;
    currentAttempt = 0;
    lastRead = rateValue;
    std::string bs = "";
    bs+= rateValue;
    pCharacteristicSensorA->setValue(bs);
    pCharacteristicSensorA->notify(true);

  }
  else
  {
    if (currentAttempt < attempts)
    {
      if (currentAttempt > checkAttempt)
      {
        String toSend = "[?]HR:";
        toSend += lastRead;
        std::string bs = "";

        bs+= lastRead + "?";
        // pCharacteristicSensorA->setValue(bs);
        // pCharacteristicSensorA->notify(true);//////////
        if(!isWritten){
          writeScreen(3, toSend);
          isWritten=true;
        }

      }
      else if (currentAttempt < checkAttempt)
      {
        String toSend = "[O]HR:";
        toSend += lastRead;
        if(updateScreen){
          writeScreen(3, toSend);
        }

      }
      currentAttempt = currentAttempt + 1;
    }
    else
    {
      String toSend = "[X]HR:N/A";
      if(lastRead!=0){
        writeScreen(3, toSend);
        lastRead = 0;
         std::string bs;
      pCharacteristicSensorA->setValue(bs);
      pCharacteristicSensorA->notify(true);
      }
     
    }
  }
//  delay(10);
}

void writeScreen(int line, String a)
{
  int ln = 7;
  if (line > 0)
  {
    char copy[a.length() + 1];
    a.toCharArray(copy, a.length() + 1);

    u8g2.setDrawColor(0);
    u8g2.drawBox(2, ((8 * line) - ln) - 1, 128, 9);
    u8g2.setDrawColor(1);
    u8g2.drawStr(2, ((8 * line)), copy);

    u8g2.sendBuffer();
  }
  else
  {
    Serial.println("Invalid arguments for write...");
  }
}

bool bt_text_connected = false;
bool bt_text_disconnected = false;

void bluetoothChecker()
{
  if (deviceConnected)
  {
    // Serial.println("Connected?");
    if(!bt_text_connected){
    writeScreen(1, "BT CONNECTED");
    String temp = device_host.c_str();
    writeScreen(5, temp);
    bt_text_connected=true;
    bt_text_disconnected=false;
    }

  }
  if (!deviceConnected)
  {
    // Serial.println("Nein?");
    if(!bt_text_disconnected){
     writeScreen(1, "BT DISCONNECTED");
     writeScreen(5, "");
     bt_text_connected=false;
     bt_text_disconnected=true;
    }
  }
}
