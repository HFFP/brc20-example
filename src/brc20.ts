// import axios from "axios"
// import * as bitcoinJs from "bitcoinjs-lib"
// import {unisatApiKey} from "../config/local"
// import * as ecpair from "ecpair"
// import {witnessStackToScriptWitness} from "bitcoinjs-lib/src/psbt/psbtutils"
// import {Psbt, PsbtTxInput} from "bitcoinjs-lib"
// import {PsbtInput} from "bip174/src/lib/interfaces"
// import {Taptree} from "bitcoinjs-lib/src/types"
// import * as console from "console"
// import {boardCast, getUTXOList} from "./utils"
// const ecc = require("tiny-secp256k1")
//
// async function main() {
//     bitcoinJs.initEccLib(ecc)
//
//     // const network = bitcoinJs.networks.bitcoin
//     // const pk = Buffer.from("", "hex")
//     // const keypair = ecpair.default(ecc).fromPrivateKey(pk, {network: network})
//     // await hello(keypair, network)
//
//     const network = bitcoinJs.networks.testnet
//     const pk = Buffer.from("", "hex")
//     const keypair = ecpair.default(ecc).fromPrivateKey(pk)
//     const myAddress = bitcoinJs.payments.p2tr({internalPubkey: keypair.publicKey.subarray(1, 33), network}).address!
//     console.log(keypair.publicKey.toString("hex"))
//     const utxos = await getUTXOList(myAddress)
//     console.log(
//         bitcoinJs.payments.p2tr({internalPubkey: keypair.publicKey.subarray(1, 33), network}).pubkey!.toString("hex"),
//         "??",
//     )
//     // console.log(utxos)
//     const utxo = {txId: utxos[0].txid, index: utxos[0].vout, amount: utxos[0].satoshi}
//     await brc20Deploy("hffp", 210000, 10, bitcoinJs.networks.testnet, utxo, keypair)
// }
//
// function createCommitTxData(
//     publicKey: Buffer,
//     inscription: {contentType: Buffer; content: Buffer},
//     network: bitcoinJs.networks.Network,
// ) {
//     console.log(publicKey.toString("hex"), "???")
//     const xOnlyPubKey = publicKey.subarray(1, 33)
//     const script = createInscriptionScript(xOnlyPubKey, inscription)
//     const outputScript = bitcoinJs.script.compile(script)
//
//     // const outputScript = bitcoinJs.script.fromASM(
//     //     `${xOnlyPubKey.toString("hex")} OP_CHECKSIG OP_0 OP_IF ${Buffer.from("ord").toString(
//     //         "hex",
//     //     )} OP_1 ${inscription.contentType.toString("hex")} OP_0 ${inscription.content.toString("hex")} OP_ENDIF`,
//     // )
//
//     const scriptTree: Taptree = {output: outputScript}
//     const redeem = {output: outputScript, redeemVersion: 192}
//     const scriptTaproot = bitcoinJs.payments.p2tr({
//         internalPubkey: xOnlyPubKey,
//         scriptTree,
//         redeem,
//         network,
//     })
//
//     const tapleaf = scriptTaproot.hash!.toString("hex")
//     const revealAddress = scriptTaproot.address
//     const tpubkey = scriptTaproot.pubkey!.toString("hex")
//     const cblock = scriptTaproot.witness?.[scriptTaproot.witness!.length - 1].toString("hex")
//
//     return {
//         tapleaf,
//         tpubkey,
//         cblock,
//         revealAddress,
//         scriptTaproot,
//         outputScript,
//     }
// }
//
// async function hello(keypair: ecpair.ECPairInterface, network: bitcoinJs.networks.Network) {
//     const inscription = createTextInscription("Hello!!")
//     const commitTxData = createCommitTxData(keypair.publicKey, inscription, network)
//     const tx = await createRevealTx(
//         {
//             cblock: commitTxData.cblock!,
//             scriptTaproot: commitTxData.scriptTaproot,
//             outputScript: commitTxData.outputScript,
//         },
//         {txId: "d2e8358a8f6257ed6fc5eabe4e85951b702918a7a5d5b79a45e535e1d5d65fb2", amount: 2301, index: 1},
//         network,
//         keypair,
//         "bc1pcf8yrw8vf5y3lxlmkjqlme7wpqywmqsdhr5ngzwvgpx63ww706fq3y4x0q",
//     )
//     console.log(tx.getId())
//     console.log(
//         tx
//             .toHex()
//             .replace(
//                 "e397d713d4832069e7a6794f62d23e7f7f8d8670aa1ebb72872ad8cb908a2575b2c71746f795bbfdba3e433e80b08ce1b5454cb2a349b25111c269b9f625cf8d",
//                 "<SIGNATURE>",
//             ),
//     )
// }
//
// async function brc20Deploy(
//     brc20: string,
//     totalSupply: number,
//     mintLimit: number,
//     network: bitcoinJs.networks.Network,
//     input: {txId: string; index: number; amount: number},
//     keypair: ecpair.ECPairInterface,
// ) {
//     const text = `{"p":"brc-20","op":"deploy","tick":"${brc20}","max":"${totalSupply}","lim":"${mintLimit}"}`
//     const inscription = createTextInscription(text)
//     const commitTxData = createCommitTxData(keypair.publicKey, inscription, network)
//     const tx = await createRevealTx(
//         {
//             cblock: commitTxData.cblock!,
//             scriptTaproot: commitTxData.scriptTaproot,
//             outputScript: commitTxData.outputScript,
//         },
//         input,
//         network,
//         keypair,
//     )
//     await boardCast(tx.toHex())
// }
//
// async function brc20Mint(brc20: string, mintAmount: number, network: bitcoinJs.networks.Network) {
//     const text = `{"p":"brc-20","op":"mint","tick":"${brc20}","amt":"${mintAmount}"}`
//     const inscription = createTextInscription(text)
// }
//
// async function brc20Transfer(brc20: string, transferAmount: number, network: bitcoinJs.networks.Network) {
//     const text = `{"p":"brc-20","op":"transfer","tick":"${brc20}","amt":"${transferAmount}"}`
//     const inscription = createTextInscription(text)
//     const publicKey = Buffer.from("")
//     const commitTxData = createCommitTxData(publicKey, inscription, network)
// }
//
// function createTextInscription(text: string) {
//     const encoder = new TextEncoder()
//     const contentType = Buffer.from(encoder.encode("text/plain;charset=utf-8"))
//     const content = Buffer.from(encoder.encode(text))
//     return {contentType, content}
// }
//
// function createInscriptionScript(xOnlyPublicKey: Buffer, inscription: {contentType: Buffer; content: Buffer}) {
//     const encoder = new TextEncoder()
//     const protocolId = Buffer.from(encoder.encode("ord"))
//     return [
//         xOnlyPublicKey,
//         bitcoinJs.opcodes.OP_CHECKSIG,
//         bitcoinJs.opcodes.OP_0,
//         bitcoinJs.opcodes.OP_IF,
//         protocolId,
//         bitcoinJs.opcodes.OP_1,
//         inscription.contentType,
//         bitcoinJs.opcodes.OP_0,
//         inscription.content,
//         bitcoinJs.opcodes.OP_ENDIF,
//     ]
// }
//
// async function createRevealTx(
//     commitTxData: {cblock: string; scriptTaproot: bitcoinJs.payments.Payment; outputScript: Buffer},
//     input: {txId: string; index: number; amount: number},
//     network: bitcoinJs.networks.Network,
//     keypair: ecpair.ECPairInterface,
//     toAddress?: string,
// ) {
//     const address =
//         toAddress ??
//         bitcoinJs.payments.p2tr({
//             internalPubkey: keypair.publicKey.subarray(1, 33),
//             network,
//         }).address
//     const tapLeafScript = {
//         leafVersion: commitTxData.scriptTaproot.redeemVersion!, // 192 0xc0
//         script: commitTxData.outputScript,
//         controlBlock: Buffer.from(commitTxData.cblock, "hex"),
//     }
//     const psbt = new bitcoinJs.Psbt({network})
//     psbt.addInput({
//         hash: input.txId,
//         index: input.index,
//         witnessUtxo: {value: input.amount, script: commitTxData.scriptTaproot.output!},
//         tapLeafScript: [tapLeafScript],
//     })
//     psbt.addOutput({
//         value: 549, // generally 1000 for nfts, 549 for brc20
//         address: address!,
//     })
//     await psbt.signInput(0, keypair)
//     const signature = psbt.data.inputs[0].tapScriptSig![0].signature.toString("hex")
//     const customFinalizer = (_inputIndex: number, input: PsbtInput) => {
//         const witness = [input.tapScriptSig![0].signature]
//             .concat(commitTxData.outputScript)
//             .concat(tapLeafScript.controlBlock)
//         return {
//             finalScriptWitness: witnessStackToScriptWitness(witness),
//         }
//     }
//     psbt.finalizeInput(0, customFinalizer)
//
//     const tx = psbt.extractTransaction()
//
//     // console.log(psbt.data.inputs[0])
//     // console.log(signature, "signature")
//     return tx
// }
// main().catch((error) => {
//     console.error(error)
// })
