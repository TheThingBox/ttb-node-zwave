'use strict';

const ZWAVE = require('ttb-lib-zwave');
const zwave = new ZWAVE();

module.exports = function (RED) {

  function main(config) {
    RED.nodes.createNode(this, config);
    this.nodeid = config.nodeid;
    this.push = config.push;
    this.mark = config.mark;
    this.brokerConn = RED.nodes.getNode(config.broker);

    var node = this;

    var zwaveTopic = zwave.zTopic;
    var topic = `${zwaveTopic}/${this.nodeid}/scene`;

    if(this.brokerConn === undefined || this.brokerConn === null) {
      this.error("nodonSoftRemote "+RED._("node-red:mqtt.errors.missing-config"));
      return;
    }

    this.brokerConn.register(node);
    this.brokerConn.subscribe(topic, 2, function(topic, payload, packet) {
      onReceive(payload, node);
    }, node.id)

    this.on('close', function (done) {
      if(node.brokerConn) {
        node.brokerConn.unsubscribe(topic, node.id);
        node.brokerConn.deregister(node, done);
      } else {
        done();
      }
    })
  }
  RED.nodes.registerType("nodonSoftRemote", main);

  function onReceive(payload, node){
    var msg = {};
    //msg.payload = zwave.getPayloadFromMqtt(payload)
    msg.payload = payload;

    switch (payload[0]) {
      case 49:
        msg.intent = 1; // open
        break;

      case 51:
        msg.intent = 0; // close
        break;

      case 50:
        msg.intent = 2; // more
        break;

      case 52:
        msg.intent = 3; // less
        break;

      default:
        break;
    }
    if(msg.hasOwnProperty('intent')){
      node.send(msg);
    }
  }
};
