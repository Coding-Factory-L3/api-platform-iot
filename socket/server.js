var SerialPort = require("serialport");
var xbee_api = require("xbee-api");
var C = xbee_api.constants;
//var storage = require("./storage")
require("dotenv").config();
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://mqtt-dashboard.com");

client.on("connect", function () {
  client.subscribe("IOT/CTF/test");
});

const SERIAL_PORT = process.env.SERIAL_PORT;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2,
});

let serialport = new SerialPort(
  SERIAL_PORT,
  { baudRate: parseInt(process.env.SERIAL_BAUDRATE) || 9600 },
  function (err) {
    if (err) {
      return console.log("Error: ", err.message);
    }
  }
);

serialport.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(serialport);

serialport.on("open", function () {
  configureBase("BASE_A", "0013A20041FB607D");
  configureBase("BASE_B", "0013A20041A72946");
  configureFlag(
    "FLAG",
    getRandomTeam() === 0 ? "0013A20041FB607D" : "0013A20041A72946"
  );
  xbeeAPI.parser.on("data", function (frame) {
    if (frame.type === C.FRAME_TYPE.NODE_IDENTIFICATION) {
      configurePlayer(frame);
    }
  });
});

function configureBase(baseName, destination64) {
  var frame_obj = {
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: destination64,
    command: "CONFIGURE_BASE",
    commandParameter: [baseName],
  };
  xbeeAPI.builder.write(frame_obj);
}

function configureFlag(flagName, destination64) {
  var frame_obj = {
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: destination64,
    command: "CONFIGURE_FLAG",
    commandParameter: [flagName],
  };
  xbeeAPI.builder.write(frame_obj);
}

function configurePlayer(frame) {
  var playerId = frame.remote64;
  var team = getRandomTeam();
  var frame_obj = {
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: playerId,
    command: "CONFIGURE_PLAYER",
    commandParameter: [team],
  };
  xbeeAPI.builder.write(frame_obj);
  // publishToMQTT("player/register", JSON.stringify(playerData));
}

function getRandomTeam() {
  return Math.floor(Math.random() * 2);
}

function publishToMQTT(topic, message) {
  client.publish(topic, message, function (err) {
    if (err) {
      console.error("Erreur lors de la publication MQTT:", err);
    } else {
      console.log("Données publiées avec succès sur le topic:", topic);
    }
  });
}
