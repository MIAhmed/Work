'use strict';
//var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

this.http_port = process.env.HTTP_PORT || 6900;
this.p2p_port = process.env.P2P_PORT || 6700;
//this.initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : []; //"ws://127.0.0.1:6800"

this.sockets = [];

var no_of_nodes = 1;
var Nodes = [];
var currentNodeIndex = 1;

this.chain = null;


this.startHttpServer = () => {
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/', function (req, res) {
        res.sendfile('index.html');
    });

    app.get('/latestBlock', (req, res) => res.send(JSON.stringify(this.chain.getLatestBlock())));
    app.get('/allBlocks', (req, res) => res.send(JSON.stringify(this.chain)));

    app.get('/peers', (req, res) => res.send(this.sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort)));

    app.post('/addBlock', (req, res) => {
        
        this.chain.addBlockFromData(new Data(req.body.fromName, req.body.toName, req.body.amount));

        res.send("Block Added: " + JSON.stringify(this.chain.getLatestBlock()));
    });

    app.post('/addPeer', (req, res) => {
        wsConnectToPeers([req.body.peer]);
        res.send("Peer added for connection: " + req.body.peer);
    });
    app.listen(this.http_port, () => console.log('Listening HTTP on port: ' + this.http_port));
};


this.startP2PServer = () => {
    var server = new WebSocket.Server({ port: this.p2p_port });
    server.on('connection', ws => initalizeConnection(ws));
    console.log('Listening Websocket P2P Port on: ' + this.p2p_port);

};

var initalizeConnection = (ws) => {
    this.sockets.push(ws);
    wsMessageHandler(ws);
    wsErrorHandler(ws);
    //wsSendMessage(ws, { 'type': MessageType.CONNECTED, 'data': sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort) });
    this.wsSendMessage(ws, { 'type': MessageType.CONNECTED, 'data': ws._socket.remoteAddress + ':' + ws._socket.remotePort });
    //wsSendMessage(ws, { 'type': MessageType.GET_BLOCKCHAIN, 'data': 'nothing' });
};

var MessageType = {
    CONNECTED: 0,
    GET_LATEST_BLOCK: 1,
    GET_BLOCKCHAIN: 2,
    RESPONSE_LATEST_BLOCK: 3,
    RESPONSE_BLOCKCHAIN: 4,
    ADD_BLOCK: 5,
    BLOCK_ADDED: 6,
};

var wsMessageHandler = (ws) => {
    ws.on('message', (data) => {
        var msg = JSON.parse(data);
        console.log("Message Recived: " + data);
        switch (msg.type) {
            case MessageType.GET_LATEST_BLOCK:
                this.wsSendMessage(ws, { 'type': MessageType.RESPONSE_BLOCK, 'data': JSON.stringify(this.chain.getLatestBlock()) });
                break;
            case MessageType.GET_BLOCKCHAIN:
                this.wsSendMessage(ws, { 'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(this.chain) });
                break;
            case MessageType.ADD_BLOCK:
                break;
            case MessageType.BLOCK_ADDED:
                this.chain.addBlockExt(msg.data);
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                this.chain.onBlockChainResponse(msg.data, ws);
                break;


        }

    })
};

var wsErrorHandler = (ws) => {
    var closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        this.sockets.splice(this.sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};


this.wsConnectToPeers = (_Peers) => {
    _Peers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', () => initalizeConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};


//var queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST });
this.wsSendMessage = (ws, message) => ws.send(JSON.stringify(message));
this.broadcast = (message) => this.sockets.forEach(socket => this.wsSendMessage(socket, message));

module.exports = this;