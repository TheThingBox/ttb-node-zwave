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

    var zwaveTopic = zwave.zTopic;
    var topic = `${zwaveTopic}/${this.nodeid}/${this.commandclass}/${this.classindex}`
    var topicIn = `${zwaveTopic}/${this.nodeid}/in`

    if(this.brokerConn === undefined || this.brokerConn === null) {
      this.error("zwave-generic "+RED._("node-red:mqtt.errors.missing-config"));
      return;
    }

    const ensureIsNumber = function(num){
      num = parseInt(num)
      if(isNaN(num)){
        return null
      }
      return num
    }

    const dimmerSwitch = function(msg){
      if(msg.intent === undefined) {
        msg.intent = msg.payload
      }
      msg.intent = ensureIsNumber(msg.intent)
      if(msg.intent === null){
        delete msg.intent
      }
      if(zwave.zNodes[node.nodeid] && zwave.zNodes[node.nodeid].ready) {
        if(zwave.zNodes[node.nodeid].classes[38] !== undefined) {
          var currentValue = zwave.zNodes[node.nodeid].classes[38]
          if(currentValue.length > 0){
            currentValue = currentValue[0].value
          } else {
            currentValue = 0
          }
          currentValue = ensureIsNumber(currentValue)
          if(currentValue === null){
            currentValue = 0
          }
          var nextValue = currentValue

          if(msg.hasOwnProperty('intent')){
            if(msg.intent === 0) {
              nextValue = 0;
            } else if(msg.intent === 1){
              nextValue = 99;
            } else if(msg.intent === 2){
              nextValue = currentValue + 10;
              if (nextValue > 99) {
                nextValue = 99;
              }
            } else if(msg.intent === 3){
              nextValue = currentValue - 10;
              if (nextValue < 0) {
                nextValue = 0;
              }
            }
            if(nextValue !== currentValue){
              zwave.setValue(node.nodeid, 38, 1, 0, nextValue)
            }
          } else if(msg.hasOwnProperty('intensity')){
            msg.intensity = ensureIsNumber(msg.intensity)
            if(msg.intensity !== null){
              if(msg.intensity === 100) {
                msg.intensity = 99
              }
              zwave.setValue(node.nodeid, 38, 1, 0, msg.intensity)
            }
          }

          if(msg.color) {
            zwave.setValue(node.nodeid, 51, 1, 0, msg.color + "0000");
          }

        }
      }
    }

    this.brokerConn.register(node);
    this.brokerConn.subscribe(topic, 2, function(topic, payload, packet) {
      var msg = {}
      msg.payload = zwave.getPayloadFromMqtt(payload)
      node.send(msg);
    }, node.id)

    this.brokerConn.subscribe(topicIn, 2, function(topic, payload, packet) {
      var msg = {}
      msg.payload = zwave.getPayloadFromMqtt(payload)
      dimmerSwitch(msg)
    }, node.id)

    subscription(RED, this, zwave);

    this.on('input', function(msg) {
      dimmerSwitch(msg)
    })

    this.on('close', function(done) {
      if(node.brokerConn) {
        node.brokerConn.unsubscribe(topic, node.id);
        node.brokerConn.unsubscribe(topicIn, node.id);
        node.brokerConn.deregister(node, done);
      } else {
        done()
      }
    })
  }
  RED.nodes.registerType("zwave-light-dimmer-switch", main);

};
