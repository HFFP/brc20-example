import {Tap, Address, Networks, Tx, Signer, TxData} from "@cmdcode/tapscript"
import {keys} from "@cmdcode/crypto-utils"
import {boardCast, createTextInscription, getAddress, getInscribeAddress, getUTXOList} from "./utils"
import * as console from "console";

interface UTXO {
    txId: string
    index: number
    amount: number
}

async function main() {
    const secret = "your private key"

    // const address = "tb1pp3yynl27w4302ztw5hh84dwrk9jg0nw3t0dqexn0qky78jndgnvqrcgpms"
    // const utxos = await getUTXOList(address)
    // const utxo = {txId: utxos[0].txid, index: utxos[0].vout, amount: utxos[0].satoshi}
    // console.log(utxo)
    // await deploy2(secret, "hffp", 210000, 1, utxo, "testnet")

    // await inscriptionMint(secret, "hffp", 1, 2, "testnet")

    const transferList = [
        {brc20: "hffp", toAddress: "tb1q7gnys2cwhkm7r73px6nus0g9dcr8mjh6fe2ums", amount: 1},
        {brc20: "hffp", toAddress: "tb1q7gnys2cwhkm7r73px6nus0g9dcr8mjh6fe2ums", amount: 1},
        {brc20: "hffp", toAddress: "tb1q7gnys2cwhkm7r73px6nus0g9dcr8mjh6fe2ums", amount: 1},
        {brc20: "hffp", toAddress: "tb1q7gnys2cwhkm7r73px6nus0g9dcr8mjh6fe2ums", amount: 1},
        {brc20: "hffp", toAddress: "tb1q7gnys2cwhkm7r73px6nus0g9dcr8mjh6fe2ums", amount: 1},
    ]
    await inscriptionTransfer(secret, transferList, "testnet")
}

main().catch((error) => {
    console.error(error)
})

async function inscriptionMint(
  secret: string,
  brc20: string,
  mintAmount: number,
  repeatNum: number,
  network: Networks,
) {
    if (repeatNum > 25) {
        throw Error(
          "Descendants limit 25!!! If you want to get around this, manage the UTXO yourself, just use confirmed UTXO",
        )
    }
    const text = `{"p":"brc-20","op":"mint","tick":"${brc20}","amt":"${mintAmount}"}`
    const inscription = createTextInscription(text)

    const seckey = keys.get_seckey(secret)
    const pubkey = keys.get_pubkey(secret, true)
    const {address, cblock, tpubkey, script, tapleaf} = getAddress(pubkey, network)
    const {
        address: inscriptionAddress,
        tpubkey: inscriptionTPubKey,
        tapleaf: inscriptionTapleaf,
        cblock: inscriptionCblock,
        script: inscriptionScript,
    } = getInscribeAddress(pubkey, inscription, network)
    console.log(address, inscriptionAddress, "address")

    const feeRate = 2
    const mintBaseUTXOAmount = 1000
    const inputs: UTXO[] = (await getUTXOList(address)).map((item) => {
        console.log(item)
        return {txId: item.txid, index: item.vout, amount: item.satoshi}
    })
    // split
    const splitTx = Tx.create({
        vin: inputs.map((item) => {
            return {
                txid: item.txId,
                vout: item.index,
                prevout: {
                    value: item.amount,
                    scriptPubKey: ["OP_1", tpubkey],
                },
            }
        }),
        vout: [...Array(repeatNum).keys()].map((_) => {
            return {
                value: mintBaseUTXOAmount,
                scriptPubKey: Address.toScriptPubKey(inscriptionAddress),
            }
        }),
    })
    const splitTxFee = (Tx.util.getTxSize(splitTx).vsize + 43) * feeRate
    const splitRecharge =
      inputs.map((item) => item.amount).reduce((pre, cur) => pre + cur) - repeatNum * mintBaseUTXOAmount - splitTxFee
    if (splitRecharge > 546) {
        splitTx.vout.push({value: splitRecharge, scriptPubKey: Address.toScriptPubKey(address)})
    }
    inputs.forEach((item, index) => {
        const sig = Signer.taproot.sign(seckey, splitTx, index, {extension: tapleaf})
        splitTx.vin[index].witness = [sig, script, cblock]
        Signer.taproot.verify(splitTx, index, {pubkey, throws: true})
    })
    const splitTxId = Tx.util.getTxid(splitTx)

    // inscription
    const mintTxs: TxData[] = []
    for (let i = 0; i < repeatNum; i++) {
        const mintTx = Tx.create({
            vin: [
                {
                    txid: splitTxId,
                    vout: i,
                    prevout: {value: mintBaseUTXOAmount, scriptPubKey: ["OP_1", inscriptionTPubKey]},
                },
            ],
            vout: [{value: 546, scriptPubKey: Address.toScriptPubKey(address)}],
        })
        const sig = Signer.taproot.sign(seckey, mintTx, 0, {extension: inscriptionTapleaf})
        mintTx.vin[0].witness = [sig, inscriptionScript, inscriptionCblock]
        Signer.taproot.verify(mintTx, 0, {pubkey, throws: true})
        mintTxs.push(mintTx)
    }
    console.log(`split tx: ${await boardCast(Tx.encode(splitTx).hex)}`)
    await Promise.all(
      mintTxs.map(async (item) => {
          console.log(`mint tx: ${await boardCast(Tx.encode(item).hex)}`)
      }),
    )
}

async function inscriptionTransfer(
  secret: string,
  transferList: {brc20: string; toAddress: string; amount: number}[],
  network: Networks,
) {
    if (transferList.length > 12) {
        throw Error(
          "Descendants limit 25!!! If you want to get around this, manage the UTXO yourself, just use confirmed UTXO",
        )
    }

    const seckey = keys.get_seckey(secret)
    const pubkey = keys.get_pubkey(secret, true)
    const {address, cblock, tpubkey, script, tapleaf} = getAddress(pubkey, network)

    const inscriptionsInfo = transferList.map((item) => {
        const text = `{"p":"brc-20","op":"transfer","tick":"${item.brc20}","amt":"${item.amount}"}`
        const inscription = createTextInscription(text)
        const {
            address: inscriptionAddress,
            tpubkey: inscriptionTPubKey,
            tapleaf: inscriptionTapleaf,
            cblock: inscriptionCblock,
            script: inscriptionScript,
        } = getInscribeAddress(pubkey, inscription, network)
        return {inscriptionAddress, inscriptionTPubKey, inscriptionTapleaf, inscriptionCblock, inscriptionScript}
    })

    const feeRate = 2
    const inscriptionBaseUTXOAmount = 2000
    const inputs: UTXO[] = (await getUTXOList(address)).map((item) => {
        return {txId: item.txid, index: item.vout, amount: item.satoshi}
    })

    // splitTx
    const splitTx = Tx.create({
        vin: inputs.map((item) => {
            return {
                txid: item.txId,
                vout: item.index,
                prevout: {
                    value: item.amount,
                    scriptPubKey: ["OP_1", tpubkey],
                },
            }
        }),
        vout: inscriptionsInfo.map((inscription) => {
            return {
                value: inscriptionBaseUTXOAmount,
                scriptPubKey: Address.toScriptPubKey(inscription.inscriptionAddress),
            }
        }),
    })
    const splitTxFee = (Tx.util.getTxSize(splitTx).vsize + 43) * feeRate
    const splitRecharge =
      inputs.map((item) => item.amount).reduce((pre, cur) => pre + cur) -
      inscriptionsInfo.length * inscriptionBaseUTXOAmount -
      splitTxFee
    splitTx.vout.push({value: splitRecharge, scriptPubKey: Address.toScriptPubKey(address)})

    inputs.forEach((item, index) => {
        const sig = Signer.taproot.sign(seckey, splitTx, index, {extension: tapleaf})
        splitTx.vin[index].witness = [sig, script, cblock]
        Signer.taproot.verify(splitTx, index, {pubkey, throws: true})
    })
    const splitTxId = Tx.util.getTxid(splitTx)

    // inscription
    const inscriptionTransferTxs: { tx: TxData, value: number }[] = []
    inscriptionsInfo.forEach((inscription, index) => {
        const tx = Tx.create({
            vin: [
                {
                    txid: splitTxId,
                    vout: index,
                    prevout: {value: inscriptionBaseUTXOAmount, scriptPubKey: ["OP_1", inscription.inscriptionTPubKey]},
                },
            ],
        })
        const fee = (Tx.util.getTxSize(splitTx).vsize + 43) * feeRate
        const value = inscriptionBaseUTXOAmount - fee
        tx.vout.push({value: value, scriptPubKey: Address.toScriptPubKey(address)})
        const sig = Signer.taproot.sign(seckey, tx, 0, {extension: inscription.inscriptionTapleaf})
        tx.vin[0].witness = [sig, inscription.inscriptionScript, inscription.inscriptionCblock]
        Signer.taproot.verify(tx, 0, {pubkey, throws: true})
        inscriptionTransferTxs.push({ tx, value })
    })

    // transfer
    const transferTxs: TxData[] = []
    inscriptionTransferTxs.forEach((inscriptionTx, index) => {
        const tx = Tx.create({
            vin: [
                {
                    txid: Tx.util.getTxid(inscriptionTx.tx),
                    vout: 0,
                    prevout: {
                        value: inscriptionTx.value,
                        scriptPubKey: ["OP_1", tpubkey],
                    },
                },
            ],
            vout: [{value: 546, scriptPubKey: Address.toScriptPubKey(transferList[index].toAddress)}],
        })

        const sig = Signer.taproot.sign(seckey, tx, 0, {extension: tapleaf})
        tx.vin[0].witness = [sig, script, cblock]
        Signer.taproot.verify(tx, 0, {pubkey, throws: true})
        transferTxs.push(tx)
    })

    console.log(`split tx: ${await boardCast(Tx.encode(splitTx).hex)}`)
    await Promise.all(
      inscriptionTransferTxs.map(async (item) => {
          console.log(`inscription transfer tx: ${await boardCast(Tx.encode(item.tx).hex)}`)
      }),
    )
    await Promise.all(
      transferTxs.map(async (item) => {
          console.log(`transfer tx: ${await boardCast(Tx.encode(item).hex)}`)
      }),
    )
}

export async function deploy(
  secret: string,
  brc20: string,
  totalSupply: number,
  mintLimit: number,
  input: {txId: string; index: number; amount: number},
  network: Networks,
) {
    const text = `{"p":"brc-20","op":"deploy","tick":"${brc20}","max":"${totalSupply}","lim":"${mintLimit}"}`
    const inscription = createTextInscription(text)

    const seckey = keys.get_seckey(secret)
    const pubkey = keys.get_pubkey(secret, true)

    const {address, tpubkey, cblock, tapleaf, script} = getInscribeAddress(pubkey, inscription, network)
    console.log(address, "address")
    const txdata = Tx.create({
        vin: [
            {
                // Use the txid of the funding transaction used to send the sats.
                txid: input.txId,
                // Specify the index value of the output that you are going to spend from.
                vout: input.index,
                // Also include the value and script of that ouput.
                prevout: {
                    // Feel free to change this if you sent a different amount.
                    value: input.amount,
                    // This is what our address looks like in script form.
                    scriptPubKey: ["OP_1", tpubkey],
                },
            },
        ],
        vout: [
            {
                // We are leaving behind 1000 sats as a fee to the miners.
                value: 546,
                // This is the new script that we are locking our funds to.
                scriptPubKey: Address.toScriptPubKey(address),
            },
            {
                value: input.amount - 5000,
                scriptPubKey: Address.toScriptPubKey(address),
            },
        ],
    })
    const sig = Signer.taproot.sign(seckey, txdata, 0, {extension: tapleaf})
    txdata.vin[0].witness = [sig, script, cblock]
    const isValid = Signer.taproot.verify(txdata, 0, {pubkey, throws: true})
    console.log(Tx.util.getTxSize(txdata), Tx.util.getTxid(txdata))
    console.log("Your txhex:", Tx.encode(txdata).hex, isValid)
    // console.dir(txdata, {depth: null})
    console.log(`deploy tx: ${await boardCast(Tx.encode(txdata).hex)}`)
}
