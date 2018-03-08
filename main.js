'use strict';
var CryptoJS = require("crypto-js");

const conn = require('./connection');
const block = require('./block');

var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : []; //"ws://127.0.0.1:6800"

var sockets = [];

var no_of_nodes = 1;
var Nodes = [];
var currentNodeIndex = 1;



let vChain = new block.Blockchain();
//console.log('block 1');
vChain.addBlock(new  block.Block(1, "02/10/2018", new block.Data("Saad", "Asad", 50)));

conn.chain = vChain;


conn.wsConnectToPeers(initialPeers);
conn.startHttpServer();
conn.startP2PServer();
console.log('before debugger');
debugger; 
console.log('after debugger');


