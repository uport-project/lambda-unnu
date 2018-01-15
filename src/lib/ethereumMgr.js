import networks from './networks'
import Web3 from 'web3'
import Promise from 'bluebird'
import { generators, signers } from 'eth-signer'
import Transaction from 'ethereumjs-tx'
import { Client } from 'pg'

const HDSigner = signers.HDSigner

const DEFAULT_GAS_PRICE = 20000000000 // 20 Gwei

class EthereumMgr {

  constructor() {
    this.pgUrl=null
    this.seed=null

    this.web3s = {}
    
    this.gasPrices = {}

    for (const network in networks) {
      let provider = new Web3.providers.HttpProvider(networks[network].rpcUrl)
      let web3 = new Web3(provider)
      web3.eth = Promise.promisifyAll(web3.eth)
      this.web3s[network] = web3

      this.gasPrices[network]= DEFAULT_GAS_PRICE;
    }
  }

  isSecretsSet(){
      return (this.pgUrl !== null || this.seed !== null);
  }

  setSecrets(secrets){
      this.pgUrl=secrets.PG_URL;
      this.seed=secrets.SEED;
  
      const hdPrivKey = generators.Phrase.toHDPrivateKey(this.seed)
      this.signer = new HDSigner(hdPrivKey)
  
  }

  getProvider(networkName) {
    if(!this.web3s[networkName]) return null;
    return this.web3s[networkName].currentProvider
  }

  getAddress(){
    return this.signer.getAddress()
  }

  async getBalance(address, networkName) {
    if(!address) throw('no address')
    if(!networkName) throw('no networkName')
    if(!this.web3s[networkName]) throw('no web3 for networkName')
    return await this.web3s[networkName].eth.getBalanceAsync(address)
  }

  async getGasPrice(networkName) {
    if(!networkName) throw('no networkName')
    try {
      this.gasPrices[networkName] = (await this.web3s[networkName].eth.getGasPriceAsync()).toNumber()
    } catch (e) {
      console.log(e)
    }
    return this.gasPrices[networkName]
  }

  async getNonce(address, networkName) {
    if(!address) throw('no address')    
    if(!networkName) throw('no networkName')    
    if(!this.pgUrl) throw('no pgUrl set')

    const client = new Client({
        connectionString: this.pgUrl,
    })

    try{
        await client.connect()
        const res=await client.query(
            "INSERT INTO nonces(address,network,nonce) \
             VALUES ($1,$2,0) \
        ON CONFLICT (address,network) DO UPDATE \
              SET nonce = nonces.nonce + 1 \
            WHERE nonces.address=$1 \
              AND nonces.network=$2 \
        RETURNING nonce;"
            , [address, networkName]);
        return res.rows[0].nonce;
    } catch (e){
        throw(e);
    } finally {
        await client.end()
    }
  }
 

  async signTx({txHex, blockchain}) {
    if(!txHex) throw('no txHex')    
    if(!blockchain) throw('no blockchain')    
    let tx = new Transaction(Buffer.from(txHex, 'hex'))
    // TODO - set correct gas Limit
    tx.gasLimit = 3000000
    tx.gasPrice = await this.getGasPrice(blockchain)
    tx.nonce = await this.getNonce(this.signer.getAddress(), blockchain)
    
    const rawTx = tx.serialize().toString('hex')
    return new Promise((resolve, reject) => {
      this.signer.signRawTx(rawTx, (error, signedRawTx) => {
        if (error) {
          reject(error)
        }
        resolve(signedRawTx)
      })
    })
  }

  async sendRawTransaction(signedRawTx, networkName) {
    if(!signedRawTx) throw('no signedRawTx')    
    if(!networkName) throw('no networkName')    
    
    if (!signedRawTx.startsWith('0x')) {
      signedRawTx= '0x'+signedRawTx
    }
    return await this.web3s[networkName].eth.sendRawTransactionAsync(signedRawTx)
  }

  async sendTransaction(txObj,networkName){
    if(!txObj) throw('no txObj')    
    if(!networkName) throw('no networkName') 

    let tx = new Transaction(txObj)
    const rawTx = tx.serialize().toString('hex')
    let signedRawTx = await this.signTx({txHex: rawTx, blockchain: networkName})
    return await this.sendRawTransaction(signedRawTx,networkName);

  }
 
}

module.exports = EthereumMgr
