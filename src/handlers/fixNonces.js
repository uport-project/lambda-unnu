import networks from '../lib/networks'
import pack from '../../package'


class FixNoncesHandler {
    constructor (ethereumMgr) {
      this.ethereumMgr = ethereumMgr
    }
  
    async handle(event, context, cb) {
        console.log(event)
        console.log(context)

        const sp=context.functionName.slice(pack.name.length+1).split('-')
        let stage=sp[0]
        console.log('stage:' +stage)

        let addr=this.ethereumMgr.getAddress();
        console.log('checking addr:'+addr)

        for (const network in networks) {
            let netNonce=await this.ethereumMgr.getTransactionCount(addr,network);
            let dbNonce=await this.ethereumMgr.readNonce(addr,network);
            let rpcUrl = networks[network].rpcUrl

            console.log('['+network+'] netNonce: '+netNonce+' dbNonce: '+dbNonce)

            if(dbNonce != netNonce){
                console.log("HEY!!!")
                await this.ethereumMgr.setNonce(addr,network,netNonce)
                console.log("Fixed with: "+netNonce)
            }
        }

        cb(null)
    }
}
module.exports = FixNoncesHandler