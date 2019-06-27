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

    if (this.brokerConn === undefined || this.brokerConn === null) {
      this.error("zwave-binary-switch "+RED._("node-red:mqtt.errors.missing-config"));
      return;
    }

    this.brokerConn.register(node);
    this.brokerConn.subscribe(topic, 2, function(topic, payload, packet) {
      onReceive(payload, node);
    }, node.id)

    this.on('input', function (msg) {
      onInput(msg, node);
    })

    this.on('close', function (done) {
      if(node.brokerConn) {
        node.brokerConn.unsubscribe(topic, node.id);
        node.brokerConn.unsubscribe(topicIn, node.id);
        node.brokerConn.deregister(node, done);
      } else {
        done();
      }
    })
  }
  RED.nodes.registerType("zwave-binary-switch", main);

  function ensureIsNumber(num){
    num = parseInt(num);
    if(isNaN(num)){
      return null;
    }
    return num;
  }

  function onReceive(payload, node){
    var msg = {}
    msg.payload = zwave.getPayloadFromMqtt(payload)
    if (typeof msg.payload === 'number') {
      msg.intensity = msg.payload;
    }

    if(msg.payload === true || msg.payload==1 || msg.payload=="1" ) {
      msg.payload = 1;
      msg.intent = 1;
      msg.message = "Sensor On";
    }

    if(msg.payload === false || msg.payload==0 || msg.payload=="0") {
      msg.payload = 0;
      msg.intent = 0;
      msg.message = "Sensor Off";
    }

    node.send(msg);
  }

  function onInput(msg, node){
    if(msg.intent === undefined) {
      msg.intent = msg.payload;
    }
    msg.intent = ensureIsNumber(msg.intent);
    if(zwave.zNodes[node.nodeid] && zwave.zNodes[node.nodeid].ready) {
      if(zwave.zNodes[node.nodeid].classes[37] !== undefined){
        if(msg.status === 'toggle') {
          var currentValue = zwave.zNodes[node.nodeid].classes[37];
          if(currentValue.length > 0){
            currentValue = currentValue[0].value;
          } else {
            currentValue = false;
          }
          if(currentValue === false) {
            zwave.setValue(node.nodeid, 37, 1, 0, true);
          } else if (currentValue === true) {
            zwave.setValue(node.nodeid, 37, 1, 0, false);
          }
        } else {
          if(msg.intent === 0) {
            zwave.setValue(node.nodeid, 37, 1, 0, false);
          } else if(msg.intent === 1){
            zwave.setValue(node.nodeid, 37, 1, 0, true);
          }
        }
      } else if(zwave.zNodes[node.nodeid] && zwave.zNodes[node.nodeid].ready && zwave.zNodes[node.nodeid].classes[38] !== undefined) {
        if(msg.intent === 0) {
          zwave.setValue(node.nodeid, 38, 1, 0, false);
        } else if(msg.intent === 1){
          zwave.setValue(node.nodeid, 38, 1, 0, true);
        }
      }
    }
  }
};
