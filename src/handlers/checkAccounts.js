
class CheckAccountsHandler {
    constructor (ethereumMgr) {
      this.ethereumMgr = ethereumMgr
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
  
      if (!body.blockchain) {
        cb ({code: 400, message: 'blockchain parameter missing'})
        return;
      }

      const rootAddr=this.ethereumMgr.addresses[0];
      let rootAddrNonce=await this.ethereumMgr.getTransactionCount(rootAddr, body.blockchain); 
      const gasPrice =  await this.ethereumMgr.getGasPrice(body.blockchain);
      const topUpTo   = 100000000000000000 //0.10 ETH 
      const threshold =  20000000000000000 //0.02 ETH 

      let promises=[];
      
      for(let i=1;i<this.ethereumMgr.addresses.length;i++){
        const addr=this.ethereumMgr.addresses[i];
        console.log("checking addr: "+addr)

        //Checking status
        promises.push( new Promise( async (done) => {
          const status = await this.ethereumMgr.getStatus(addr,body.blockchain);
          console.log("["+addr+"] status:"+status);
          if(status!=null && status.startsWith('0x')){

            //Check if mined;
            const txReceipt=await this.ethereumMgr.getTransactionReceipt(status,body.blockchain);
            //console.log(txReceipt);
            if(txReceipt!=null){
              console.log(txReceipt);
              console.log("["+addr+"]    ...releasing account")
              await this.ethereumMgr.updateAccount(addr,body.blockchain,null);
              console.log("["+addr+"]    ...released!")
            }
          }
          done();
        }));
        
        

        //Check balance
        promises.push( new Promise( async (done) => {
          const balance = await this.ethereumMgr.getBalance(addr,body.blockchain);
          console.log("["+addr+"] balance:"+balance);
          if(balance < threshold){ 
            console.log("["+addr+"]       not enough balance! < "+threshold);
            let amountToFund = topUpTo - balance;
            console.log("["+addr+"]       amountToFund: "+amountToFund);
            
            //Sending tx
            let fundingTx = {
              from: rootAddr,
              to: addr,
              value: amountToFund,
              gas: 21000,
              gasPrice: gasPrice,
              nonce: rootAddrNonce
            };
            rootAddrNonce++;
            console.log(fundingTx);
            
            let txHash = await this.ethereumMgr.sendTransaction(fundingTx,body.blockchain);
            console.log("["+addr+"]    txHash: "+txHash)
            
          }
          done();
        }));

      }

      Promise.all(promises)
      .catch( (err)=>{
        console.log(err)
        cb({ code: 500, message: err.message });
      })
      .then( (promiseRes) => {
        //console.log(promisesRes);
        cb(null, 'OK')
        return;
      })
  }
}
module.exports = CheckAccountsHandler;
