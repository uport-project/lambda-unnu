import { IdentityManager } from 'uport-identity'
import Contract from 'truffle-contract'
import { lchmod } from 'fs';

class IdentityManagerMgr {

  constructor(ethereumMgr) {
    this.identityManagers = {}
    this.metaIdentityManagers = {}
    this.ethereumMgr=ethereumMgr;
  }

  async initIdentityManager(managerType,networkName) {
    if(!managerType) throw('no managerType')
    if(!networkName) throw('no networkName')

    let idMgrs,idMgrArtifact;
    switch(managerType){
      case 'IdentityManager':
        idMgrs = this.identityManagers
        idMgrArtifact = IdentityManager.v2
        break;
      case 'MetaIdentityManager':
        idMgrs = this.metaIdentityManagers
        idMgrArtifact = MetaIdentityManager.v2
        break;
      default:
        throw('invalid managerType')
    }    
    
    if (!idMidMgrsgr[networkName]) {
      let provider=this.ethereumMgr.getProvider(networkName)
      if(provider==null) throw ('null provider')
      
      let IdMgrContract = new Contract(idMgrArtifact)
      IdMgrContract.setProvider(provider)
      this.idMgrs[networkName] = await IdMgrContract.deployed()
    }
  }

  async createIdentity({deviceKey, recoveryKey, blockchain, managerType, payload}) {
    if(!deviceKey) throw('no deviceKey')    
    if(!managerType) throw('no managerType')
    if (payload && !payload.destination) throw('payload but no payload.destination') 
    if (payload && !payload.data) throw('payload but no payload.data') 
    let recoveryKeyFix

    let zeroHexString = /^0x[^1-9]+$/
    if (recoveryKey && !recoveryKey.match(zeroHexString)) {
        recoveryKeyFix = recoveryKey
      } else {
        recoveryKeyFix = deviceKey
      }

    let idMgrs;
    switch(managerType){
      case 'IdentityManager':
        idMgrs = this.identityManagers
        break;
      case 'MetaIdentityManager':
        idMgrs = this.metaIdentityManagers
        break;
      default:
        throw('invalid managerType')
    }    
      

    await this.initIdentityManager(managerType,blockchain)
    let from = this.ethereumMgr.getAddress()
    let txOptions = {
      from: from,
      gas: 3000000,
      gasPrice: this.ethereumMgr.getGasPrice(blockchain),
      nonce: this.ethereumMgr.getNonce(from,blockchain)
    }
    
    if (payload) {
      return await idMgrs[blockchain].createIdentityWithCall(deviceKey, recoveryKey, payload.destination, payload.data, txOptions)
    } else {
      return await idMgrs[blockchain].createIdentity(deviceKey, recoveryKey, txOptions)
    }
  }


}
module.exports = IdentityManagerMgr
