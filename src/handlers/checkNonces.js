import networks from "../lib/networks";
import pack from "../../package";

class CheckNoncesHandler {
  constructor(ethereumMgr, slackMgr) {
    this.ethereumMgr = ethereumMgr;
    this.slackMgr = slackMgr;
  }

  async handle(event, context, cb) {
    console.log(event);
    console.log(context);

    const sp = context.functionName.slice(pack.name.length + 1).split("-");
    let stage = sp[0];
    console.log("stage:" + stage);

    let addr = this.ethereumMgr.getAddress();
    console.log("checking addr:" + addr);

    for (const network in networks) {
      let netNonce = await this.ethereumMgr.getTransactionCount(addr, network);
      let dbNonce = await this.ethereumMgr.readNonce(addr, network);
      let rpcUrl = networks[network].rpcUrl;

      console.log(
        "[" + network + "] netNonce: " + netNonce + " dbNonce: " + dbNonce
      );

      if (dbNonce >= netNonce) {
        console.log("HEY!!!");
        let etherscanHost = network === "mainnet" ? "" : network + ".";
        let text =
          "Nonce for *" +
          pack.name +
          "-" +
          stage +
          "* on " +
          rpcUrl +
          " out of sync!";
        let addrUrl =
          "<https://" +
          etherscanHost +
          "etherscan.io/address/" +
          addr +
          "|" +
          addr +
          ">";

        let slackMsg = {
          username: "Nonce Checker",
          icon_emoji: ":robot_face:",
          attachments: [
            {
              fallback: text,
              pretext: "<!here|here>: " + text,
              color: "danger",
              fields: [
                { title: "Nonce at Database   ", value: dbNonce, short: true },
                { title: "Nonce at Blockchain", value: netNonce, short: true }
              ],
              footer: "Check Nonce at: " + addrUrl
            }
          ]
        };
        //console.log(JSON.stringify(slackMsg))
        this.slackMgr.sendMessage(slackMsg);
      }
    }

    cb(null);
  }
}
module.exports = CheckNoncesHandler;
