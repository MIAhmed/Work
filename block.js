
const SHA256 = require("crypto-js/sha256");

//module.exports = () => {

class NodeInfo {
    constructor(index, publicKey, socket) {
        this.index = index;
        this.publicKey = publicKey;
        this.socket = socket;
    }
}

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
        var totalSigned = rawbuff.readInt16BE(0); // getting no of signed from first 2 bytes
        for (var i = 2; i < (rawbuff.length - 64); i += 2) {
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
        broadcast({ 'type': MessageType.BLOCK_ADDED, 'data': _newBlock, 'nodeIndex': currentNodeIndex });

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


    onBlockChainResponse(_peerChain, _ws) {
        var _peerChain = JSON.parse(_peerChain);
        var _peerBlocks = _peerChain.chain.sort((block1, block2) => (block1.index - block2.index));
        var _peerLatesBlock = _peerBlocks[_peerBlocks.length - 1];
        console.log('Peer latest block index:' + _peerLatesBlock.index);
        var ourLatestBlock = this.getLatestBlock();
        if (parseInt(_peerLatesBlock.index) > parseInt(ourLatestBlock.index)) {
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
        else {
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
//};
//module.exports = this;
module.exports.Blockchain = Blockchain;
module.exports.Block = Block;
module.exports.Data = Data;
module.exports.NodeInfo = NodeInfo; 