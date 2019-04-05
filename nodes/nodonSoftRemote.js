'use strict';

const ZWAVE = require('ttb-lib-zwave')
const zwave = new ZWAVE()

module.exports = function (RED) {

  function main(config) {
    RED.nodes.createNode(this, config);
    this.nodeid = config.nodeid
    this.push = config.push
    this.mark = config.mark
    this.brokerConn = RED.nodes.getNode(config.broker);

    var zwaveTopic = zwave.zTopic;
    this.topic = `${zwaveTopic}/${node.nodeid}/${node.commandclass}/${node.classindex}`

    var node = this

    if(this.brokerConn === undefined || this.brokerConn === null) {
      node.error(RED._("node-red:mqtt.errors.missing-config"));
      return;
    }

    this.brokerConn.register(node);
    this.brokerConn.subscribe(topicpub, 2, function(topic, payload, packet) {
      var msg = {}
      //msg.payload = zwave.getPayloadFromMqtt(payload)
      msg.payload = payload

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
        node.send(msg)
      }
    }, node.id)

    this.on('close', function (done) {
      if(node.brokerConn) {
        node.brokerConn.unsubscribe(topicpub, node.id);
        node.brokerConn.deregister(node, done);
      } else {
        done()
      }
    })
  }
  RED.nodes.registerType("nodonSoftRemote", main);
};
