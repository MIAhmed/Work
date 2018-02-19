'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

var http_port = process.env.HTTP_PORT || 6900;
var p2p_port = process.env.P2P_PORT || 6700;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : []; //"ws://127.0.0.1:6800"

var sockets = [];
var MessageType = {
    CONNECTED: 0,
    GET_LATEST_BLOCK: 1,
    GET_BLOCKCHAIN: 2,
    RESPONSE_LATEST_BLOCK: 3,
    RESPONSE_BLOCKCHAIN: 4, 
    ADD_BLOCK: 5,
    BLOCK_ADDED: 6,
};

var startHttpServer = () => {
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/', function (req, res) {
        res.sendfile('index.html');
    });

    app.get('/latestBlock', (req, res) => res.send(JSON.stringify(vChain.getLatestBlock())));
    app.get('/allBlocks', (req, res) => res.send(JSON.stringify(vChain)));
    
    app.post('/addBlock', (req, res) => {
    
            
        vChain.addBlockFromData(new Data(req.body.fromName, req.body.toName, req.body.amount));
        
        res.send("Block Added: " + JSON.stringify(vChain.getLatestBlock()));
    });

    app.post('/addPeer', (req, res) => {
        wsConnectToPeers([req.body.peer]);
        res.send("Peer added for connection: " + req.body.peer);
    });
    app.listen(http_port, () => console.log('Listening HTTP on port: ' + http_port));
};


var startP2PServer = () => {
    var server = new WebSocket.Server({ port: p2p_port });
    server.on('connection', ws => initalizeConnection(ws));
    console.log('Listening Websocket P2P Port on: ' + p2p_port);
    
};

var initalizeConnection = (ws) => { 
    sockets.push(ws);
    wsMessageHandler(ws);
    wsErrorHandler(ws);
    //wsSendMessage(ws, { 'type': MessageType.CONNECTED, 'data': sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort) });
    wsSendMessage(ws, { 'type': MessageType.CONNECTED, 'data': ws._socket.remoteAddress + ':' + ws._socket.remotePort });
};

var wsMessageHandler = (ws) => {
    ws.on('message', (data) => {
        var msg = JSON.parse(data);
        console.log("Message Recived: " + data);
        switch (msg.type) {
            case MessageType.GET_LATEST_BLOCK:
                wsSendMessage(ws, { 'type': MessageType.RESPONSE_BLOCK, 'data': JSON.stringify(vChain.getLatestBlock()) });
                break;
            case MessageType.GET_BLOCKCHAIN:
                wsSendMessage(ws, { 'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(vChain) });
                break;
            case MessageType.ADD_BLOCK:
                break;
            case MessageType.BLOCK_ADDED:
                vChain.addBlockExt(msg.data);
                break;


        }

    })
};

var wsErrorHandler = (ws) => {
    var closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};


var wsConnectToPeers = (_Peers) => {
    _Peers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', () => initalizeConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};


//var queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST });
var wsSendMessage = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(socket => wsSendMessage(socket, message));


const SHA256 = require("crypto-js/sha256");

var hndlBlockchainResponse = (message) => {
    var receivedBlocks = JSON.parse(message.data).sort((block1, block2) => (block1.index - block2.index));
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockPresent = vChain.getLatestBlock();
    
};


class Block {
    constructor(_index, _timestamp, _data, _prevHash = '', _nonce = 0 ) {
        this.index = _index;
        this.prevHash = _prevHash;
        this.timestamp = _timestamp;
        this.Data = _data;
        this.hash = this.calculateHash();
        this.nonce = _nonce;
    }
   
    calculateHash() {
        return SHA256(this.index + this.prevHash + this.timestamp + JSON.stringify(this.data) + this.nonce).toString();
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log("New block mined with hash: " + this.hash);
    }
}

class Data {
    constructor(_fromName, _toName, _amount) {
        this.fromName = _fromName;
        this.toName = _toName;
        this.amount = _amount;
    }
}

class Blockchain {

    constructor() {
        this.difficulty = 4;
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock() {
        var _newBlock = new Block(0, "02/01/2017", new Data());
        //_newBlock.mineBlock(this.difficulty);
        return _newBlock;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(_newBlock) {
        _newBlock.index = parseInt(this.getLatestBlock().index) + 1; 
        _newBlock.prevHash = this.getLatestBlock().hash;
        _newBlock.mineBlock(this.difficulty);
        this.chain.push(_newBlock);
    }

    
    addBlockExt(_newBlock) {
        //_newBlock.index = parseInt(this.this.getLatestBlock().index) + 1;
        //_newBlock.prevHash = this.getLatestBlock().hash;
        //_newBlock.mineBlock(this.difficulty);

        this.chain.push(_newBlock);
        console.log("block added from peer with index: " + _newBlock.index);
    }
    addBlockFromData(_data) {

        var _newBlock = new Block(parseInt(this.getLatestBlock().index) + 1, new Date().toUTCString(), _data, this.getLatestBlock().hash );
        _newBlock.mineBlock(this.difficulty);
        this.chain.push(_newBlock);
        broadcast({ 'type': MessageType.BLOCK_ADDED, 'data': _newBlock });
        
    }
    
}



const fs = require('fs');



let vChain = new Blockchain();
//console.log('block 1');
//vChain.addBlock(new Block(1, "02/10/2018", new Data("Saad", "Asad", 50)));
//console.log('block 2');
//vChain.addBlock(new Block(1, "02/11/2018", new Data("Asad", "Ali", 10)));
//console.log('block 3');
//vChain.addBlock(new Block(1, "02/11/2018", new Data("Saad", "Ali", 25)));

wsConnectToPeers(initialPeers);
startHttpServer();
startP2PServer();