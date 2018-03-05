// 
const EC = require('elliptic').ec;

// Create and initialize EC context 
// (better do it once and reuse it) 
const ec = new EC('secp256k1');


const AES = require("crypto");
this.SHA256 = require("crypto-js/sha256");

this.hash = (msg)=>{    //32byte
	return this.SHA256(msg).toString();
};

this.dbhash = (msg)=>{ //32byte
	return this.SHA256(this.SHA256(msg).toString()).toString();
};

function Cryptoengine(){
    self=this;
}

this.sign = function (msg,privkey){
    if(!msg || !privkey) return false;
    var key = ec.keyFromPrivate(privkey, 'hex');
    try{
    var Signature = key.sign(msg).toDER('hex');
    }catch(e){Signature=false;}
        return Signature;
};
this.verify = function (msg,signature,pubkey){
    if(!msg || !signature || !pubkey) return false;
    var key = ec.keyFromPublic(pubkey, 'hex');
    if(!key) return false;
    try{
        return key.verify(msg, signature);
    }catch(e) {return false;}
}
this.setLedgerKey = function(file_of_pem_key){
    // Gen File by command 
    //// openssl genrsa -out keypem/my-server3.key.pem 2048
    // openssl rsa -in keypem/my-server3.key.pem -pubout -out keypem/my-server3.pub
    var fs = require("fs");
    this.privateKey = {key:fs.readFileSync(file_of_pem_key, "utf8")
    ,padding:AES.constants.RSA_NO_PADDING};
    ;

};
this.encrypt = function (buffer,first=false){  // For Ledger Encrypt
	if(!this.privateKey){
	    console.log("Please set Privatekey file first (funciton setLedgerKey(file) )");
	    return false;
	}
    try{
    	if(!first){
        	var result_encrypt   = AES.privateEncrypt(this.privateKey,buffer);
        }else{
        	var result_encrypt   = AES.privateEncrypt(this.privateKey.key,buffer);
        }
    } catch (e) {
        console.log(e);
        return false;
    }
    return result_encrypt;
};

this.decrypt = function (pubkey,buffer,first=false){   // For Ledger Decrypt
    
	if(!pubkey){
	    console.log("Please set Privatekey file first (funciton setLedgerKey(file) )");
	    return false;
    }
    if (pubkey.toString().indexOf("-----BEGIN") == -1)
        pubkey = "-----BEGIN PUBLIC KEY-----\n" + pubkey + "\n-----END PUBLIC KEY-----";
    
    try{
        if(!first){
        	var result_decrypt   = AES.publicDecrypt({key:pubkey,
    	    padding:AES.constants.RSA_NO_PADDING},buffer);
        }else{
	        var result_decrypt   = AES.publicDecrypt(pubkey,buffer);
        }
    } catch (e) {
        console.log(e);
        return false;
    }
    
    return result_decrypt;
};

this.ledgersign = function(msg){
      var sign = AES.createSign('RSA-SHA256');
       sign.update(msg);
       return sign.sign(this.privateKey, 'hex');
       
}

this.genKeyPair = function (createFile=false) {
    var key = ec.genKeyPair()
    if (createFile) {
        var fs = require('fs');
        fs.writeFileSync("keys/private.key", key.getPrivate('hex'));
        console.log("PrivateKey File saved");

        fs.writeFileSync("keys/public.key", key.getPublic(true, 'hex'));
        console.log("PublicKey File saved");
    }
    return key;
}


this.loadKey = function () {
    var fs = require('fs');
    var pvtKey = fs.readFileSync("keys/private.key", "utf8");
    //console.log("PrivateKey read: " + pvtKey);

    var pubKey = fs.readFileSync("keys/public.key", "utf8");
    console.log("PublicKey read: " + pubKey);
    var key = ec.keyFromPrivate(pvtKey, 'hex');
    console.log("PublicKey retr: " +  key.getPublic(true,'hex'));
    return key;
}


this.GetFileText = function (_fileName) {
    var fs = require('fs');
    var retString = fs.readFileSync(_fileName, "utf8");
    return retString;
}



module.exports = this;