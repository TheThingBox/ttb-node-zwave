'use strict';

const ZWAVE = require('ttb-lib-zwave')
const zwave = new ZWAVE()

module.exports = function (RED) {
  function main(config) {
    RED.nodes.createNode(this, config);
    this.nodeid = config.nodeid
    this.mark = config.mark
    this.commandclass = config.commandclass
    this.classindex = config.classindex
    this.productname = config.productname
    this.classindexname = config.classindexname
    this.brokerConn = RED.nodes.getNode(config.broker);

    var node = this;

    if(this.brokerConn === undefined || this.brokerConn === null) {
      node.error("zwave-generic "+RED._("node-red:mqtt.errors.missing-config"));
      return;
    }

    var zwaveTopic = zwave.zTopic;
    var topicpub = `${zwaveTopic}/${node.nodeid}/${node.commandclass}/${node.classindex}`;

    this.brokerConn.register(node);
    this.brokerConn.subscribe(topicpub, 2, function(topic, payload, packet){
      var msg = {}
      msg.payload = zwave.getPayloadFromMqtt(payload)

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
    }, node.id);

    this.on('close', function(done) {
      if(node.brokerConn) {
        node.brokerConn.unsubscribe(topicpub, node.id);
        node.brokerConn.deregister(node, done);
      } else {
        done()
      }
    });

  }
  RED.nodes.registerType("zwave-generic", main);
};
