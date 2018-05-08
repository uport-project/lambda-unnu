'use strict'
const AWS = require('aws-sdk');

const AuthMgr = require('./lib/authMgr')
const EthereumMgr = require('./lib/ethereumMgr')
const IdentityManagerMgr = require('./lib/identityManagerMgr')
const CreateIdentityHandler = require('./handlers/createIdentity')
const LookupHandler = require('./handlers/lookup')
const CheckPendingHandler = require('./handlers/checkPending')
const CheckAccountsHandler = require('./handlers/checkAccounts')

let authMgr = new AuthMgr()
let ethereumMgr = new EthereumMgr()
let identityManagerMgr = new IdentityManagerMgr(ethereumMgr)

let createIdentity = new CreateIdentityHandler(authMgr,identityManagerMgr)
let lookupHandler = new LookupHandler(identityManagerMgr)
let checkPendingHandler = new CheckPendingHandler(identityManagerMgr)
let checkAccountsHandler = new CheckAccountsHandler(ethereumMgr)

module.exports.createIdentity = (event, context, callback) => { preHandler(createIdentity,event,context,callback) }
module.exports.lookup = (event, context, callback) => { preHandler(lookupHandler,event,context,callback) }
module.exports.checkPending = (event, context, callback) => { preHandler(checkPendingHandler,event,context,callback) }
module.exports.checkAccounts = (event, context, callback) => { preHandler(checkAccountsHandler,event,context,callback) }


const preHandler = (handler,event,context,callback) =>{
  console.log(event)
  if(!ethereumMgr.isSecretsSet() ||
     !authMgr.isSecretsSet() || 
     !identityManagerMgr.isSecretsSet()){
    const kms = new AWS.KMS();
    kms.decrypt({
      CiphertextBlob: Buffer(process.env.SECRETS, 'base64')
    }).promise().then(data => {
      const decrypted = String(data.Plaintext)
      authMgr.setSecrets(JSON.parse(decrypted))
      ethereumMgr.setSecrets(JSON.parse(decrypted))
      identityManagerMgr.setSecrets(JSON.parse(decrypted))
      doHandler(handler,event,context,callback)
    })
  }else{
    doHandler(handler,event,context,callback)
  }
}

const doHandler = (handler,event,context,callback) =>{
  handler.handle(event,context,(err,resp)=>{
    let response;
    if(err==null){
      response = {
          statusCode: 200,
          body: JSON.stringify({
            status: 'success',
            data: resp
          })
        }
    }else{
      //console.log(err);
      let code=500;
      if(err.code) code=err.code;
      let message=err;
      if(err.message) message=err.message;
      
      response = {
        statusCode: code,
        body: JSON.stringify({
          status: 'error',
          message: message
        })
      }
    }

    callback(null, response)
  })

}
