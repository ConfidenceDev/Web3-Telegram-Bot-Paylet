const { default: axios } = require("axios");
const Web3 = require("web3");
const Tx = require("ethereumjs-tx").Transaction;
const Common = require("ethereumjs-common").default;
const redstone = require("redstone-api");
const express = require("express");
const router = express.Router();

//============= Initialization ====================
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.TEST_NET));
const blockchainID = 97; // 56, 97
const testNum = ["2348022656777"];

const common = Common.forCustomChain(
  "mainnet",
  {
    name: "bsc",
    networkId: web3.utils.toHex(blockchainID),
    chainId: web3.utils.toHex(blockchainID),
  },
  "petersburg"
);
let menu = -1;
let isNext = true;
let sAdd = null,
  sKey = null,
  sAmt = null;
let tArr = [];
let rateArr = [];
let isCreated = false;

//============= Address ======================
const revAddress = process.env.REV_ADDRESS;

//============= FUnctions ======================
router.post("/query", async (req, res) => {
  try {
    console.log(res.msg);
    res.status(200).json({ msg: res.msg });

    const data = res.msg.trim();
    if (data.startsWith("/create")) {
      const obj1 = await createAccount();
      const url = `https://testnet.bscscan.com/address/${obj1.address}`;

      const msg1 = `
          WALLET CREATED
          PUBLIC KEY: ${obj1.address}
          PRIVATE KEY: ${obj1.privateKey}
          Do not reveal your private key to anyone to protect your assets.
        `;
    } else if (data.startsWith("/balance")) {
      const balKey = data.split(" ")[1].trim();
      await getCoinsValue();

      if (!balKey || balKey.length > 67 || balKey.length < 65) return;

      const obj2 = await findWallet(balKey);
      const result = await web3.eth.getBalance(
        web3.utils.toChecksumAddress(obj2.address)
      );
      const rel = await web3.utils.fromWei(result, "ether");
      const msg2 = `
      Balance: ${rel} BNB
      
      1 BNB = ${rateArr[0] ? rateArr[0] : 0} USD
        `;
    } else if (data.startsWith("/wallet")) {
      const walletKey = data.split(" ")[1].trim();

      if (!walletKey || walletKey.length > 67 || walletKey.length < 65) return;

      const obj = await findWallet(walletKey);
      const msg3 = `
        Your wallet address is: ${obj.address}
          
        Send only BEP20 coins/tokens to this address
      `;
    } else if (data.startsWith("/send")) {
      const sendArr = data.split(" ");
      const sendDestAdd = sendArr[1];
      const sendAmt = sendArr[2];
      const sendKey = sendArr[3];

      if (!sendDestAdd || !sendAmt || !sendKey) return;

      if (!(parseFloat(sendAmt) > 0)) return;

      if (sendKey.length > 67 || sendKey.length < 65) return;

      sendTransaction(sendKey, sendDestAdd, sendAmt);
    } else if (data.startsWith("/confirm")) {
    } else if (data.startsWith("/help")) {
      const msg = `
        All on BSC(Bep20)
        pk = private key

        /create = new wallet
        /balance <pk>
        /wallet <pk>
        /send <destination address> <amount> <pk>
        visit: https://paylet.me for more info
      `;
      sendMsg(res, testNum, msg);
    }
  } catch (err) {
    console.log(err);
  }
});

async function sendMsg(res, num, msg) {
  try {
    const data = {
      to: num,
      from: "Payletinc",
      sms: msg,
      type: "plain",
      api_key: process.env.API_KEY,
      channel: "generic",
    };
    const result = await axios.post(
      "https://api.ng.termii.com/api/sms/send",
      data
    );

    if (!result) {
      console.log("Something went wrong!");
      return;
    }

    res.status(200).json({ msg: result });
  } catch (err) {
    console.log(err);
  }
}

async function createAccount() {
  try {
    return await web3.eth.accounts.create();
  } catch (err) {
    console.log(err);
  }
}

async function getCoinsValue() {
  try {
    const prices = await redstone.getPrice(["BNB", "BTC", "ETH", "USDT"]);
    rateArr[0] = round_up(prices.BNB.value, 2);
    rateArr[1] = round_up(prices.BTC.value, 2);
    rateArr[2] = round_up(prices.ETH.value, 2);
    rateArr[3] = round_up(prices.USDT.value, 2);
  } catch (err) {
    console.log(err);
  }
}

async function findWallet(pk) {
  try {
    return await web3.eth.accounts.privateKeyToAccount(pk);
  } catch (err) {
    console.log(err);
  }
}

//================== Transaction =====================
async function sendTransaction(pk, to, amt) {
  try {
    const sObj = await findWallet(pk);
    const from = sObj.address;
    const res32 = pk.split("0x")[1];
    const privKey = Buffer.from(res32, "hex");

    let txCount = await web3.eth.getTransactionCount(from);
    web3.eth.getBalance(from, async (err, result) => {
      if (err) {
        return;
      }

      const balance = web3.utils.fromWei(result, "ether");
      const gasPrices = await getCurrentGasPrices();
      const lP = parseFloat(gasPrices.low / 4).toFixed(4) * 100;
      const pGas = 21000;

      const calcWei = await web3.utils.toWei((lP * pGas).toString(), "gwei");
      const calcGas = await web3.utils.fromWei(calcWei, "ether");
      const feeGwei = (lP * pGas * 2).toString();
      const feeWei = await web3.utils.toWei(feeGwei, "gwei");
      const feeBNB = await web3.utils.fromWei(feeWei, "ether");

      const bothTx = calcGas * 2;
      const totalGas = parseFloat(bothTx) + parseFloat(feeBNB);
      const checkBal = parseFloat(amt) + totalGas;

      const msg = `
        Amount: ${amt} BNB
        Gas: ${calcGas} BNB
        Fee: ${feeBNB} BNB
        Total Fee: ${totalGas} BNB
        To be Debited: ${checkBal} BNB

        send /cancel to terminate and /confirm to proceed
        `;
    });
  } catch (err) {
    console.log(err);
  }
}

module.exports = router;
