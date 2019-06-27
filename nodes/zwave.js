'use strict';

const devicePath = "/dev/ttyACM0"; // Z-Stick Gen5
//const devicePath="/dev/ttyUSB0"; // Z-Stick S2

const ZWAVE = require('ttb-lib-zwave');
const zwave = new ZWAVE({devicePath: devicePath});

module.exports = function(RED) {

  function main(config) {
    RED.nodes.createNode(this, config);
    this.topic = config.topic;
    this.broker = config.broker;
    this.brokerConn = RED.nodes.getNode(this.broker);
    var node = this;

    if(this.brokerConn) {
      this.status({ fill:"blue", shape:"dot", text:"node-red:common.status.connecting" });
      node.brokerConn.register(node);

      zwave.init(node)
      .then(() => {
        node.log('Z-Wave network scan complete!');
        this.status({ fill:"green", shape:"dot", text:"node-red:common.status.connected" });
        RED.comms.publish("notifyUI", { text: RED._("ttb-zwave/zwave:zwave.scancomplete"), type: 'success', fixed: false });
      })
      .catch(() =>{
        this.status({ fill:"red", shape:"ring", text:"node-red:common.status.disconnected" });
      })

      zwave.on('node added', function (nodeid) {
        var mess = "Node " + nodeid + " is added";
        var msg = {
          payload: mess,
          message: mess,
          ready: false,
          topic: nodeid
        };
        node.send(msg);
      })

      zwave.on('node ready', function (nodeid, nodeinfo) {
        var device = nodeinfo.type + " (" + nodeinfo.product + ")";
        var mess = "Node " + nodeid + " - " + device + " is ready";
        var msg = {
          payload: mess,
          message: mess,
          device: device,
          ready: true,
          topic: nodeid
        };
        node.send(msg);
      });

      zwave.on('value added', function (nodeid, comclass, value) {
        //node.send({payload:"value added!" + comclass + " / " + value});
      });

      this.on('close', function(done) {
        zwave.removeAllListeners()
        if(node.brokerConn){
          node.brokerConn.deregister(node, done);
        } else {
          done();
        }
      })
    }
  }

  RED.nodes.registerType("zwave", main);

  RED.httpAdmin.get("/zwave/nodesArray", function(req, res) {
    if(!zwave.zNodes) {
      return res.status(400).json({err: "ERROR"});
    }
    res.json(zwave.zNodes.slice());
  });

  RED.httpAdmin.get("/zwave/classToHide", function(req, res) {
    res.json(zwave.getComclassToHide());
  });

};
