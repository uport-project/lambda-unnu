import networks from "./networks";
import Web3 from "web3";
import Promise from "bluebird";
import { generators, signers } from "eth-signer";
import Transaction from "ethereumjs-tx";
import { Client } from "pg";
import SignerProvider from "ethjs-provider-signer";

const HDSigner = signers.HDSigner;

const DEFAULT_GAS_PRICE = 20000000000; // 20 Gwei

class EthereumMgr {
  constructor() {
    this.pgUrl = null;
    this.seed = null;

    this.web3s = {};
    this.gasPrices = {};
  }

  isSecretsSet() {
    return this.pgUrl !== null || this.seed !== null;
  }

  setSecrets(secrets) {
    this.pgUrl = secrets.PG_URL;
    this.seed = secrets.SEED;

    
    this.signers={};
    this.addresses=[];

    //Init root account
    this.initAccount(0);

    //Init 20 accounts
    for(let i=1;i<=20;i++){
      this.initAccount(i);
    }

    const txSigner = {
      signTransaction: (tx_params, cb) => {
        let tx = new Transaction(tx_params);
        let rawTx = tx.serialize().toString("hex");
        this.signers[tx.from].signRawTx(rawTx, (err, signedRawTx) => {
          cb(err, "0x" + signedRawTx);
        });
      },
      accounts: cb => cb(null, this.addresses)
    };

    //Web3s for all networks
    for (const network in networks) {
      let provider = new SignerProvider(networks[network].rpcUrl, txSigner);
      let web3 = new Web3(provider);
      web3.eth = Promise.promisifyAll(web3.eth);
      this.web3s[network]=web3

      this.gasPrices[network] = DEFAULT_GAS_PRICE;
    }
  }

  initAccount(index){
    const hdPrivKey = generators.Phrase.toHDPrivateKey(this.seed);
    const signer = new HDSigner(hdPrivKey,index);
    const addr = signer.getAddress();
    this.signers[addr]=signer;
    this.addresses[index]=addr;
    return addr;
  }

  getAccount(index){
    if(index >= this.addresses.length) throw "index overflow";
    return this.addresses[index];
  }

  getProvider(networkName) {
    if (!this.web3s[networkName]) return null;
    return this.web3s[networkName].currentProvider;
  }

  getNetworkId(networkName) {
    if (!networkName) throw "no networkName";
    return networks[networkName].id;
  }

  getContract(abi, networkName) {
    if (!abi) throw "no abi";
    if (!networkName) throw "no networkName";
    if (!this.web3s[networkName]) throw "no web3 for networkName";
    return this.web3s[networkName].eth.contract(abi);
  }

  async getTransactionReceipt(txHash, networkName) {
    if (!txHash) throw "no txHash";
    if (!networkName) throw "no networkName";
    if (!this.web3s[networkName]) throw "no web3 for networkName";
    return await this.web3s[networkName].eth.getTransactionReceiptAsync(txHash);
  }

  async getBalance(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.web3s[networkName]) throw "no web3 for networkName";
    return await this.web3s[networkName].eth.getBalanceAsync(address);
  }

  async getGasPrice(networkName) {
    if (!networkName) throw "no networkName";
    try {
      const networkGasPrice = (await this.web3s[networkName].eth.getGasPriceAsync()).toNumber();
      if(networkGasPrice > DEFAULT_GAS_PRICE)
        this.gasPrices[networkName] = networkGasPrice;
      else
        this.gasPrices[networkName] = DEFAULT_GAS_PRICE;
    } catch (e) {
      console.log("getGasPrice ERROR:")
      console.log(e);
    }
    return this.gasPrices[networkName];
  }

  async getTransactionCount(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.web3s[networkName]) throw "no web3 for networkName";
    return await this.web3s[networkName].eth.getTransactionCountAsync(address);
  }

  async getNonce(address, networkName){
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    const txCount = await this.getTransactionCount(address, networkName);
    return parseInt(txCount - 1)
  }

  async getAvailableAddress(networkName,minBalance){
    if (!networkName) throw "no networkName";
    if (!minBalance) minBalance=0;

    const addr=this.getAccount(1);

    let canLock=await this.lockAccount(addr,networkName);

    if(canLock) return addr;
    else return null;
  }

  async lockAccount(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "INSERT INTO accounts(address,network,status) \
             VALUES ($1,$2,'locked') \
        ON CONFLICT (address,network) DO UPDATE \
              SET status = 'locked' \
            WHERE accounts.address=$1 \
              AND accounts.network=$2 \
              AND accounts.status is NULL \
        RETURNING accounts.address;",
        [address, networkName]
      );
      return (res.rows.length == 1)
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async updateAccount(address,networkName,status){
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!status) throw "no status";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "INSERT INTO accounts(address,network,status) \
             VALUES ($1,$2,$3) \
        ON CONFLICT (address,network) DO UPDATE \
              SET status = $3 \
            WHERE accounts.address=$1 \
              AND accounts.network=$2 \
        RETURNING accounts.address;",
        [address, networkName, status]
      );
      return res.rows[0]
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  


}

module.exports = EthereumMgr;
