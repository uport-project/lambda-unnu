

class LookupHandler {
    constructor (identityManagerMgr) {
      this.identityManagerMgr = identityManagerMgr
    }
  
    async handle(event, context, cb) {
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
      
      let idCreationObj; 
      try{
        console.log("calling identityManagerMgr.getIdentityCreation")
        idCreationObj = await this.identityManagerMgr.getIdentityCreation(body.deviceKey) 
      } catch(err) {
        console.log("Error on this.identityManagerMgr.getIdentityCreation")
        console.log(err)
        cb({ code: 500, message: err.message })
        return;
      }

      //no record found
      if(!idCreationObj){
        cb({ code: 404, message: 'no record found' })
        return;
      }

      let identity;
      //identity not found (need to get txReceipt)
      if(!idCreationObj.identity){
        try{
          console.log("calling identityManagerMgr.getIdentityFromTxHash")
          identity = await this.identityManagerMgr.getIdentityFromTxHash(idCreationObj.tx_hash,idCreationObj.network) 
          if(!identity){
              cb({ code: 404, message: 'null identity. Not mined yet?' })
              return;
          }
        } catch(err) {
          console.log("Error on this.identityManagerMgr.getIdentityFromTxHash")
          console.log(err)
          cb({ code: 500, message: err.message })
          return;
        }
      }else{
        identity = idCreationObj.identity
    }

      
      let resp={
        managerType: idCreationObj.manager_type,
        managerAddress: idCreationObj.manager_address,
        identity: identity,
        blockchain: body.blockchain
      }
      cb(null, resp)
      return;
  
    }
  
  }
  module.exports = LookupHandler
  