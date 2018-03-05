'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

var http_port = process.env.HTTP_PORT || 6900;
var p2p_port = process.env.P2P_PORT || 6700;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : []; //"ws://127.0.0.1:6800"

var sockets = [];

var no_of_nodes = 1;
var Nodes = [];
var currentNodeIndex = 1;

class NodeInfo {
    constructor(index, publicKey, socket) {
        this.index = index;
        this.publicKey = publicKey;
        this.socket = socket;
    }
}



var startHttpServer = () => {
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/', function (req, res) {
        res.sendfile('index.html');
    });

    app.get('/latestBlock', (req, res) => res.send(JSON.stringify(vChain.getLatestBlock())));
    app.get('/allBlocks', (req, res) => res.send(JSON.stringify(vChain)));

    app.get('/peers', (req, res) => res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort)));

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
    wsSendMessage(ws, { 'type': MessageType.GET_BLOCKCHAIN, 'data': 'nothing' });
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
            case MessageType.RESPONSE_BLOCKCHAIN:
                //var tChain = 
                vChain.onBlockChainResponse(msg.data, ws);
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

const ce = require('./cryptoengine');

ce.setLedgerKey("keys/key.pvt");


class Block {
    constructor(_index, _timestamp, _data, _prevHash = '') {
        this.index = _index;
        this.prevHash = _prevHash;
        this.timestamp = _timestamp;
        this.Data = _data;
        this.hash = this.calculateHash();
        //this.nonce = _nonce;
        this.signEncrypt = '';

    }
   
    calculateHash() {
        return SHA256(this.index + this.prevHash + this.timestamp + JSON.stringify(this.data)).toString();
    }

    mineBlock(difficulty) {
        //while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
        //    this.nonce++;
            this.hash = this.calculateHash();
        //}
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
        this.tempChain = [];
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
        _newBlock.hash = _newBlock.calculateHash()
        //_newBlock.mineBlock(this.difficulty);
        this.chain.push(_newBlock);
    }


    addBlockExt(_newBlock) {
        //_newBlock.index = parseInt(this.this.getLatestBlock().index) + 1;
        //_newBlock.prevHash = this.getLatestBlock().hash;
        //_newBlock.mineBlock(this.difficulty);
        //console.log("Block added on peer, checking its validity.");
        //if (this.isNewBlockValid(_newBlock, this.getLatestBlock())){
        //    this.chain.push(_newBlock);
        //    console.log("block added from peer with index: " + _newBlock.index);
        //} else {
        //    console.log("Recived block is invalid rejecting");
        //}

        // checking block signing
        var rawbuff = Buffer.from(_newBlock, 'hex');
        var arr = []; // 
        var totalSigned = rawbuff.readInt16BE(0); // getting no of signed
        for (var i = 2; i < (rawbuff.length - 64); i += 2)
        {
            arr.push(rawbuff.readInt16BE(i)); 
        }
        var buff = buff.slice(buff.length - 64); 
        


    }
    addBlockFromData(_data) {

        var _newBlock = new Block(parseInt(this.getLatestBlock().index) + 1, new Date().toUTCString(), _data, this.getLatestBlock().hash);
        //_newBlock.mineBlock(this.difficulty);
        _newBlock.hash = _newBlock.calculateHash();
        
        var tmpEnc = ce.encrypt(new Buffer(vChain.chain[1].hash)).toString('hex');
        
        var buff = new Buffer(68);
        buff.writeInt16BE(1, 0);
        buff.writeInt16BE(currentNodeIndex, 2);
        buff.write(tmpEnc, 4, 'hex');
        _newBlock.signEncrypt = buff.toString('hex');

        this.tempChain.push(_newBlock);
        broadcast({ 'type': MessageType.BLOCK_ADDED, 'data': _newBlock  , 'nodeIndex' : currentNodeIndex });

    }

    isNewBlockValid(_newBlock, _prevBlock) {
        if (_prevBlock.index + 1 !== _newBlock.index) {
            console.log('invalid index for new block');
            return false;
        } else if (_prevBlock.hash != _newBlock.prevHash) {
            console.log('invalid previoushash of current block');
            return false;
        } else if (this.calculateBlockHash(_newBlock) != _newBlock.hash) { 
            console.log('invalid hash for the new block');
            return false;
        }
        return true;
    }


    onBlockChainResponse(_peerChain , _ws) {
        var _peerChain = JSON.parse(_peerChain);
        var _peerBlocks = _peerChain.chain.sort((block1, block2) => (block1.index - block2.index));
        var _peerLatesBlock = _peerBlocks[_peerBlocks.length - 1];
        console.log('Peer latest block index:' + _peerLatesBlock.index);
        var ourLatestBlock = this.getLatestBlock();
        if (parseInt(_peerLatesBlock.index) > parseInt( ourLatestBlock.index)) {
            console.log('Our chain lenght is less: ' + ourLatestBlock.index + ' than Peer lenght: ' + _peerLatesBlock.index);
            if (ourLatestBlock.hash == _peerLatesBlock.previousHash) {
                console.log("We can add lastes block to our chain");
                this.chain.push(_peerLatesBlock);
            } else if (_peerBlocks.length == 1) {
                console.log("We need to look at other peer");

            } else {
                console.log("Received blockchain is longer than current blockchain");
                this.replaceChain(_peerBlocks);
            }
        } else if (parseInt(_peerLatesBlock.index) < parseInt(ourLatestBlock.index)) {

            console.log('received blockchain lenght is lesser than our, sending our blockchain');
            //wsSendMessage(_ws, { 'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(this.chain) });
        }
        else
        {
            console.log('Recieved Blockchain is fine with our blockchain');
        }

    }

    replaceChain(newBlocks) {
        if (this.isValidChain(newBlocks) && newBlocks.length > this.chain.length) {
            console.log('Received blockchain is valid. adding to current blockchain');
            this.chain = newBlocks;
        } else {
            console.log('Received blockchain invalid');
        }
    }

    isValidChain(blockchainToValidate) {
        if (JSON.stringify(blockchainToValidate[0]) != JSON.stringify(this.createGenesisBlock())) {
            return false;
        }
        var tempBlocks = [blockchainToValidate[0]];
        for (var i = 1; i < blockchainToValidate.length; i++) {
            if (this.isNewBlockValid(blockchainToValidate[i], tempBlocks[i - 1])) {
                tempBlocks.push(blockchainToValidate[i]);
            } else {
                return false;
            }
            return true;
        }


    }
    calculateBlockHash(_block) {
        return SHA256(_block.index + _block.prevHash + _block.timestamp + JSON.stringify(_block.data)).toString();
    }
}


//const fs = require('fs');




let vChain = new Blockchain();
//console.log('block 1');
vChain.addBlock(new Block(1, "02/10/2018", new Data("Saad", "Asad", 50)));
//console.log('block 2');
vChain.addBlock(new Block(2, "02/11/2018", new Data("Asad", "Ali", 10)));
//console.log('block 3');
//vChain.addBlock(new Block(1, "02/11/2018", new Data("Saad", "Ali", 25)));


const EC = require('elliptic').ec;

const ec = new EC('secp256k1');

var key = ce.genKeyPair();




wsConnectToPeers(initialPeers);
startHttpServer();
startP2PServer();
console.log('before debugger');
debugger; 
console.log('after debugger');