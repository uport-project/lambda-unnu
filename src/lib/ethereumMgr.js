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

    const hdPrivKey = generators.Phrase.toHDPrivateKey(this.seed);
    
    //Create 10 addresses + signers
    let signers={};
    this.addresses=[];
    for (let i = 0; i < 10; i++) { 
      const signer = new HDSigner(hdPrivKey,i);
      const addr = signer.getAddress();
      signers[addr]=signer;
      this.addresses[i]=addr;
    }

    const txSigner = {
      signTransaction: (tx_params, cb) => {
        let tx = new Transaction(tx_params);
        let rawTx = tx.serialize().toString("hex");
        signers[tx.from].signRawTx(rawTx, (err, signedRawTx) => {
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

  getAccount(index){
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

  async getNonce(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "INSERT INTO accounts(address,network,nonce) \
             VALUES ($1,$2,0) \
        ON CONFLICT (address,network) DO UPDATE \
              SET nonce = accounts.nonce + 1 \
            WHERE accounts.address=$1 \
              AND accounts.network=$2 \
        RETURNING nonce;",
        [address, networkName]
      );
      return res.rows[0].nonce;
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async readNonce(address, networkName) {
    return await this.readAddressParameter(address, networkName, 'nonce');
  }
  async readBalance(address, networkName) {
    return await this.readAddressParameter(address, networkName, 'balance');
  }

  async readAddressParameter(address, networkName, param) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!param) throw "no param";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "SELECT "+param+" \
               FROM accounts \
              WHERE accounts.address=$1 \
                AND accounts.network=$2",
        [address, networkName]
      );
      return res.rows[0][param];
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async setNonce(address, networkName, nonce) {
    if(!nonce) throw('no nonce')
    return await setAddressParameter(address, networkName, 'nonce', nonce)
  }

  async setBalance(address, networkName, balance) {
    if(!balance) throw('no balance')
    return await setAddressParameter(address, networkName, 'balance', balance)
  }
  
  async setAddressParameter(address, networkName, param, value) {
    if(!address) throw('no address')
    if(!networkName) throw('no networkName')
    if(!param) throw('no param')
    if(!value) throw('no value')
    if(!this.pgUrl) throw('no pgUrl set')

    const client = new Client({
        connectionString: this.pgUrl,
    })

    try{
        await client.connect()
        const res=await client.query(
            "UPDATE accounts \
                SET "+param+"=$3 \
              WHERE accounts.address=$1 \
                AND accounts.network=$2"
            , [address, networkName,value]);
        return res;
    } catch (e){
        throw(e);
    } finally {
        await client.end()
    }
  }


  
  //Check for available address. No pending tx and enough balance
  async getAvailableAddress(networkName,minBalance) {
    if(!networkName) throw('no networkName')
    if(!minBalance) throw('no minBalance')
    if(!this.pgUrl) throw('no pgUrl set')

    const client = new Client({
      connectionString: this.pgUrl,
    })

    try {
      await client.connect();
      const res = await client.query(
        "SELECT address \
               FROM accounts \
              WHERE accounts.network=$1 \
                AND accounts.balance > $2 \
                AND accounts.pending_tx IS NULL",
        [networkName,minBalance]
      );
      if(res.rows.length==0){
        return null;
      }else{
        return res.rows[0].address;
      }
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

}

module.exports = EthereumMgr;
