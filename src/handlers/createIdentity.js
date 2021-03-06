

class CreateIdentityHandler {
    constructor (authMgr,identityManagerMgr) {
      this.authMgr = authMgr
      this.identityManagerMgr = identityManagerMgr
    }
  
    async handle(event, context, cb) {
      let authToken;
      try{
        authToken = await this.authMgr.verifyNisaba(event)
      } catch(err) {
        console.log("Error on this.authMgr.verifyNisaba")
        console.log(err)
        cb({ code: 401, message: err })
        return;
      }
  
      let body;
  
      if (event && !event.body){
        body = event
      } else if (event && event.body) {
        try {
          body = JSON.parse(event.body)
        } catch (e) {
          cb({ code: 400, message: 'no json body'})
          return;
        }
      } else {
        cb({code: 400, message: 'no json body'})
        return;
      }
  
      if (!body.deviceKey) {
        cb ({code: 400, message: 'deviceKey parameter missing'})
        return;
      }
      if (!body.recoveryKey) {
        cb ({code: 400, message: 'recoveryKey parameter missing'})
        return;
      }
      if (!body.blockchain) {
        cb ({code: 400, message: 'blockchain parameter missing'})
        return;
      }
      if (!body.managerType) {
        cb ({code: 400, message: 'managerType parameter missing'})
        return;
      }
     
      if (body.managerType !== 'IdentityManager' && body.managerType !== 'MetaIdentityManager') {
        cb ({code: 400, message: 'managerType parameter invalid'})
        return;
      }
      
      if (body.payload && !(body.payload.destination && body.payload.data)) {
        cb({code: 400, message: 'payload given but missing destination or data'})
        return;
      }      

      //Verify auth and body.deviceKey
      if(authToken.sub !== body.deviceKey){
        console.log("authToken.sub !== body.deviceKey")
        cb({ code: 403, message: 'Auth token mismatch. Does not match with deviceKey' })
        return;
      }

      //Check if the deviceKey has created an identity already
      let idCreationObj; 
      try{
        console.log("calling identityManagerMgr.getIdentityCreation")
        idCreationObj = await this.identityManagerMgr.getIdentityCreation(body.deviceKey) 
      } catch(err) {
        console.log("Error on this.identityManagerMgr.getIdentityCreation")
        console.log(err)
        cb({ code: 500, message: err })
        return;
      }

      if(idCreationObj){
        const mess="deviceKey already used. On tx: "+idCreationObj.tx_hash
        console.log(mess)
        let resp = {
          managerType: idCreationObj.manager_type,
          managerAddress: idCreationObj.manager_address,
          txHash: idCreationObj.tx_hash
        }
        cb(null, resp)
        return;
      }

      //Create Identity
      try{
        console.log("calling identityManagerMgr.createIdentity")
        const {managerAddress,txHash} = await this.identityManagerMgr.createIdentity(body) 
        console.log("managerAddress:"+managerAddress)
        console.log("txHash:"+txHash)

        let resp={
            managerType: body.managerType,
            managerAddress: managerAddress,
            txHash: txHash
        }
        cb(null, resp)
      } catch(err) {
        console.log("Error on this.identityManagerMgr.createIdentity")
        console.log(err)
        cb({ code: 500, message: err.message })
        return;
      }
  
    }
  
  }
  module.exports = CreateIdentityHandler
  