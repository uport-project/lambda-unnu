import networks from "../lib/networks";
import pack from "../../package";

class CreateWorkerHandler {
  constructor(ethereumMgr) {
    this.ethereumMgr = ethereumMgr;
  }

  async handle(event, context, cb) {
    //console.log(event);
    //console.log(context);

    const sp = context.functionName.slice(pack.name.length + 1).split("-");
    let stage = sp[0];
    console.log("stage:" + stage);

    let accountCount = await this.ethereumMgr.getAccountsCount();
    console.log("accountCount: " + accountCount);

    //AccountCount is the new index, since include the rootAccount

    let newAddr = await this.ethereumMgr.initAccount(accountCount);
    console.log("newAddr: " +newAddr);

    for (const network in networks) {
      let netNonce = await this.ethereumMgr.getTransactionCount(newAddr, network);
      console.log("[" + network + "]   netNonce: " + netNonce);
      await this.ethereumMgr.setNonce(newAddr, network, parseInt(netNonce - 1));

      let netBalance = await this.ethereumMgr.getBalance(newAddr, network);
      console.log("[" + network + "] netBalance: " + netBalance);
      await this.ethereumMgr.setBalance(newAddr, network, parseInt(netBalance));

    }

    cb(null);
  }
}
module.exports = CreateWorkerHandler;
