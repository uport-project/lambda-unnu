'use strict'
const AWS = require('aws-sdk');

const EthereumMgr = require('./lib/ethereumMgr')
const IdentityManagerMgr = require('./lib/identityManagerMgr')
const SlackMgr = require('./lib/slackMgr')
const CheckBalancesHandler = require('./handlers/checkBalances')
const CheckPendingHandler = require('./handlers/checkPending')
const CheckAccountsHandler = require('./handlers/checkAccounts')

let ethereumMgr = new EthereumMgr()
let identityManagerMgr = new IdentityManagerMgr(ethereumMgr)
let slackMgr = new SlackMgr()

let checkBalances = new CheckBalancesHandler(ethereumMgr,slackMgr)
let checkPending = new CheckPendingHandler(identityManagerMgr)
let checkAccounts = new CheckAccountsHandler(ethereumMgr)

module.exports.checkBalances = (event, context, callback) => { preHandler(checkBalances,event,context,callback) }
module.exports.checkPendings = (event, context, callback) => { 
  preHandler(checkPending,{blockchain: 'rinkeby',age: 3600},context,callback) 
  preHandler(checkPending,{blockchain: 'ropsten',age: 3600},context,callback) 
  preHandler(checkPending,{blockchain: 'kovan',age: 3600},context,callback) 


  preHandler(checkAccounts,{blockchain: 'rinkeby'},context,callback) 
  preHandler(checkAccounts,{blockchain: 'ropsten'},context,callback) 
  preHandler(checkAccounts,{blockchain: 'kovan'},context,callback) 
}



const preHandler = (handler,event,context,callback) =>{
  console.log(event)
  if(!ethereumMgr.isSecretsSet() ||
     !slackMgr.isSecretsSet()) {
    const kms = new AWS.KMS();
    kms.decrypt({
      CiphertextBlob: Buffer(process.env.SECRETS, 'base64')
    }).promise().then(data => {
      const decrypted = String(data.Plaintext)
      ethereumMgr.setSecrets(JSON.parse(decrypted))
      identityManagerMgr.setSecrets(JSON.parse(decrypted))
      slackMgr.setSecrets(JSON.parse(decrypted))
      handler.handle(event,context,callback)
    })
  }else{
    handler.handle(event,context,callback)
  }
}
