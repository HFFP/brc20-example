import axios from "axios"
import {unisatApiKey} from "../config/local"
import {Address, Networks, Tap} from "@cmdcode/tapscript"
import {Buff} from "@cmdcode/buff-utils"

export async function getUTXOList(address: string, skip: number = 0, size: number = 10) {
    const url = `https://open-api-testnet.unisat.io/v1/indexer/address/${address}/utxo-data?cursor=${skip}&size=${size}`
    const {data} = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${unisatApiKey}`,
        },
    })
    return data.data.utxo
}

export async function boardCast(txHex: string) {
    const url = "https://mempool.space/testnet/api/tx"
    const {data, status} = await axios.post(url, txHex, {validateStatus: () => true})
    if (status !== 200) {
        throw Error(data)
    }
    return data
    // const url = "https://api-testnet.unisat.io/wallet-v4/tx/broadcast"
    // const {data} = await axios.post(url, {rawtx: txHex}, {validateStatus: () => true})
    // console.log(data)
}

export function createTextInscription(text: string) {
    const encoder = new TextEncoder()
    const contentType = Buffer.from(encoder.encode("text/plain;charset=utf-8"))
    const content = Buffer.from(encoder.encode(text))
    // const contentType = Buff.encode("text/plain;charset=utf-8")
    // const content = Buff.encode(text)
    return {contentType, content}
}

export function getAddress(pubkey: Buff, network: Networks) {
    const script = [pubkey, "OP_CHECKSIG"]
    const tapleaf = Tap.encodeScript(script)
    const [tpubkey, cblock] = Tap.getPubKey(pubkey, {target: tapleaf})
    const address = Address.p2tr.fromPubKey(tpubkey, network)
    return {address, tpubkey, script, cblock, tapleaf}
}

export function getInscribeAddress(
    pubkey: Buff,
    inscription: {contentType: Buffer; content: Buffer},
    network: Networks,
) {
    const encoder = new TextEncoder()
    const script = [
        pubkey,
        "OP_CHECKSIG",
        "OP_0",
        "OP_IF",
        Buffer.from(encoder.encode("ord")),
        "01",
        inscription.contentType,
        "OP_0",
        inscription.content,
        "OP_ENDIF",
    ]
    const tapleaf = Tap.encodeScript(script)
    const [tpubkey, cblock] = Tap.getPubKey(pubkey, {target: tapleaf})
    const address = Address.p2tr.fromPubKey(tpubkey, network)
    return {address, tpubkey, script, cblock, tapleaf}
}
