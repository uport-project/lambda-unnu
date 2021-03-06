import { IdentityManager, MetaIdentityManager } from "uport-identity";
import Promise from "bluebird";
import { Client } from "pg";
import abi from "ethjs-abi";

class IdentityManagerMgr {
  constructor(ethereumMgr) {
    this.identityManagers = {};
    this.metaIdentityManagers = {};
    this.ethereumMgr = ethereumMgr;
    this.pgUrl = null;
  }

  isSecretsSet() {
    return this.pgUrl !== null;
  }

  setSecrets(secrets) {
    this.pgUrl = secrets.PG_URL;
  }

  async initIdentityManager(managerType, networkName) {
    if (!managerType) throw "no managerType";
    if (!networkName) throw "no networkName";

    let idMgrs, idMgrArtifact;
    switch (managerType) {
      case "IdentityManager":
        idMgrs = this.identityManagers;
        idMgrArtifact = IdentityManager.v2;
        break;
      case "MetaIdentityManager":
        idMgrs = this.metaIdentityManagers;
        idMgrArtifact = MetaIdentityManager.v2;
        break;
      default:
        throw "invalid managerType";
    }

    if (!idMgrs[networkName]) {
      let abi = idMgrArtifact.abi;
      let imAddr =
        idMgrArtifact.networks[this.ethereumMgr.getNetworkId(networkName)]
          .address;
      let IdMgrContract = this.ethereumMgr.getContract(abi, networkName);
      idMgrs[networkName] = IdMgrContract.at(imAddr);
      idMgrs[networkName] = Promise.promisifyAll(idMgrs[networkName]);
    }
  }

  async createIdentity({
    deviceKey,
    recoveryKey,
    blockchain,
    managerType,
    payload
  }) {
    if (!deviceKey) throw "no deviceKey";
    if (!managerType) throw "no managerType";
    if (payload && !payload.destination)
      throw "payload but no payload.destination";
    if (payload && !payload.data) throw "payload but no payload.data";
    let recoveryKeyFix;

    let zeroHexString = /^0x[^1-9]+$/;
    if (recoveryKey && !recoveryKey.match(zeroHexString)) {
      recoveryKeyFix = recoveryKey;
    } else {
      recoveryKeyFix = deviceKey;
    }

    let idMgrs;
    switch (managerType) {
      case "IdentityManager":
        idMgrs = this.identityManagers;
        break;
      case "MetaIdentityManager":
        idMgrs = this.metaIdentityManagers;
        break;
      default:
        throw "invalid managerType";
    }

    await this.initIdentityManager(managerType, blockchain);
    let from = this.ethereumMgr.getAddress(); //TODO: read from provider
    let txOptions = {
      from: from,
      gas: 400000,
      gasPrice: await this.ethereumMgr.getGasPrice(blockchain),
      nonce: await this.ethereumMgr.getNonce(from, blockchain)
    };

    console.log("Gas Price used");
    console.log(txOptions.gasPrice);
    //Return object
    let ret = {
      managerAddress: idMgrs[blockchain].address
    };

    if (payload) {
      ret.txHash = await idMgrs[blockchain].createIdentityWithCallAsync(
        deviceKey,
        recoveryKeyFix,
        payload.destination,
        payload.data,
        txOptions
      );
    } else {
      ret.txHash = await idMgrs[blockchain].createIdentityAsync(
        deviceKey,
        recoveryKeyFix,
        txOptions
      );
    }

    await this.storeIdentityCreation(
      deviceKey,
      ret.txHash,
      blockchain,
      managerType,
      ret.managerAddress,
      txOptions
    );
    return ret;
  }

  async storeIdentityCreation(
    deviceKey,
    txHash,
    networkName,
    managerType,
    managerAddress,
    txOptions
  ) {
    if (!deviceKey) throw "no deviceKey";
    if (!txHash) throw "no txHash";
    if (!networkName) throw "no networkName";
    if (!managerType) throw "no managerType";
    if (!managerAddress) throw "no managerAddress";
    if (!txOptions) throw "no txOptions";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "INSERT INTO identities(device_key,tx_hash, network,manager_type,manager_address,tx_options) \
             VALUES ($1,$2,$3,$4,$5,$6) ",
        [deviceKey, txHash, networkName, managerType, managerAddress, txOptions]
      );
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async getIdentityCreation(deviceKey) {
    if (!deviceKey) throw "no deviceKey";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "SELECT tx_hash, manager_type, manager_address, identity, network \
               FROM identities \
              WHERE device_key = $1 \
           ORDER BY created \
              LIMIT 1",
        [deviceKey]
      );
      return res.rows[0];
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async getIdentityFromTxHash(txHash, blockchain) {
    if (!txHash) throw "no txHash";
    if (!blockchain) throw "no blockchain";
    if (!this.pgUrl) throw "no pgUrl set";

    const txReceipt = await this.ethereumMgr.getTransactionReceipt(
      txHash,
      blockchain
    );
    if (!txReceipt) return null;

    const decodedLogs = await this.decodeLogs(txReceipt);
    const identity = decodedLogs.identity;

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "UPDATE identities \
                SET identity = $2, \
                    tx_receipt = $3, \
                    updated = now() \
              WHERE tx_hash = $1",
        [txHash, identity, txReceipt]
      );
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }

    return identity;
  }

  async decodeLogs(txReceipt) {
    if (!txReceipt) throw "no txReceipt";
    const idMgrArtifact = MetaIdentityManager.v3; //TODO: need to fix this

    let eventAbi = idMgrArtifact.abi.filter(o => {
      return o.name === "LogIdentityCreated";
    })[0];
    let log = txReceipt.logs[0]; //I hope is always the first one
    return abi.decodeEvent(eventAbi, log.data, log.topics);
  }

  async getTxData(txHash, blockchain) {
    await this.ethereumMgr.getTransaction(txHash, blockchain);
  }

  async getPendingTx(blockchain,age){
    if (!blockchain) throw "no blockchain";
    if (!age) throw "no age";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "SELECT tx_hash \
           FROM identities \
          WHERE tx_receipt is NULL \
            AND network = $1 \
            AND created > now() - CAST ($2 AS INTERVAL)",
        [blockchain, age+' seconds']
      );
      return res;
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }
  
}
module.exports = IdentityManagerMgr;
