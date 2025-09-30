// MQTT Broker setup using Aedes (Node.js) with WebSocket support
// Run this file to start a local MQTT broker on ports 1883 (MQTT) and 8083 (WebSocket)

import aedes from 'aedes';
import net from 'net';
import http from 'http';
import websocket from 'websocket-stream';

const broker = aedes();
const MQTT_PORT = 1884; // Use different port to avoid conflict with existing Mosquitto
const WS_PORT = 8084; // Use different port for WebSocket
const HOST = '0.0.0.0'; // Listen on all interfaces

// MQTT over TCP (standard)
const mqttServer = net.createServer(broker.handle);
mqttServer.listen(MQTT_PORT, HOST, function () {
  const address = mqttServer.address();
  console.log(`MQTT broker (TCP) listening on ${address.address}:${address.port}`);
});

// MQTT over WebSocket
const httpServer = http.createServer();
httpServer.listen(WS_PORT, HOST, function () {
  const address = httpServer.address();
  console.log(`MQTT broker (WebSocket) listening on ${address.address}:${address.port}`);
});

// Use websocket-stream for WebSocket MQTT
websocket.createServer({ server: httpServer }, broker.handle);

httpServer.listen(WS_PORT, HOST, function () {
  const address = httpServer.address();
  console.log(`MQTT broker (WebSocket) listening on ${address.address}:${address.port}`);
});

broker.on('client', function (client) {
  console.log(`Client Connected: ${client ? client.id : 'unknown'} to broker`);
});

broker.on('clientDisconnect', function (client) {
  console.log(`Client Disconnected: ${client ? client.id : 'unknown'} from broker`);
});

broker.on('publish', function (packet, client) {
  if (client) {
    console.log(`Message from client ${client.id}: topic=${packet.topic} payload=${packet.payload.toString()}`);
  }
});

broker.on('subscribe', function (subscriptions, client) {
  if (client) {
    console.log(`Client ${client.id} subscribed to topics: ${subscriptions.map(s => s.topic).join(', ')}`);
  }
});

broker.on('unsubscribe', function (subscriptions, client) {
  if (client) {
    console.log(`Client ${client.id} unsubscribed from topics: ${subscriptions.join(', ')}`);
  }
});
