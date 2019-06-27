'use strict';

const ZWAVE = require('ttb-lib-zwave');
const zwave = new ZWAVE();

module.exports = function (RED) {

  function main(config) {
    RED.nodes.createNode(this, config);
    this.nodeid = config.nodeid;
    this.mark = config.mark;
    this.commandclass = config.commandclass;
    this.classindex = config.classindex;
    this.productname = config.productname;
    this.classindexname = config.classindexname;
    this.brokerConn = RED.nodes.getNode(config.broker);

    var node = this;

    var zwaveTopic = zwave.zTopic;
    var topic = `${zwaveTopic}/${this.nodeid}/${this.commandclass}/${this.classindex}`;

    if(this.brokerConn === undefined || this.brokerConn === null) {
      this.error("zwave-generic "+RED._("node-red:mqtt.errors.missing-config"));
      return;
    }

    this.brokerConn.register(node);
    this.brokerConn.subscribe(topic, 2, function(topic, payload, packet){
      onReceive(payload, node);
    }, node.id);

    this.on('close', function(done) {
      if(node.brokerConn) {
        node.brokerConn.unsubscribe(topic, node.id);
        node.brokerConn.deregister(node, done);
      } else {
        done();
      }
    });

  }
  RED.nodes.registerType("zwave-generic", main);

  function onReceive(payload, node){
    var msg = {};
    msg.payload = zwave.getPayloadFromMqtt(payload);

    if(typeof msg.payload === 'number') {
      msg.intensity = msg.payload;
    }

    if(msg.payload === true) {
      msg.payload = 1;
      msg.intent = 1;
      msg.message = "Sensor On";
    }

    if(msg.payload === false) {
      msg.payload = 0;
      msg.intent = 0;
      msg.message = "Sensor Off";
    }
    node.send(msg);
  }
};
