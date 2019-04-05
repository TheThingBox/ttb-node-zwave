'use strict';

const ZWAVE = require('ttb-lib-zwave')
const zwave = new ZWAVE()

module.exports = function(RED) {
  function zwaveInclusionNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
      if(typeof msg.payload !== 'undefined') {
        node.log("Inclusion mode activated !");
        RED.comms.publish("notifyUI", {
          text: RED._("ttb-zwave/zwave:zwave.inclusion"),
          type: 'success',
          fixed: false
        });
        zwave.addNode();
      }
    });
  }
  RED.nodes.registerType('zwave-inclusion-node', zwaveInclusionNode);
};
