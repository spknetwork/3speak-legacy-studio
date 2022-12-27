import { config } from "../config/index.js";
import Ed25519ProviderImport from "key-did-provider-ed25519";
import Crypto from 'crypto'
import KeyResolver from 'key-did-resolver'
import DIDImport from 'dids'
import Axios from 'axios'
import { CID } from 'multiformats/cid'
import { File, Blob } from '@web-std/file'

import ipfsCluster from 'ipfs-cluster-api';
import FormData from 'form-data'
import { Cluster } from '@nftstorage/ipfs-cluster'
import fetch from '@web-std/fetch'
import './../page_conf.js';
import mongoDB from '../mongoDB.js';
import fs from 'fs'

const { Ed25519Provider } = Ed25519ProviderImport;

const { DID } = DIDImport;

Object.assign(global, { fetch, File, Blob, FormData })

let cluster;
if(process.env.ENV === "dev") {
    cluster = new Cluster(process.env.IPFS_CLUSTER_URL, {
        headers: {
           
        }
    })

} else {
    cluster = new Cluster('http://localhost:9094', {
    })
}


console.log(DID)

let key = new Ed25519Provider(Buffer.from(config.appEncoderPrivate, 'base64'))
const did = new DID({ provider: key, resolver: KeyResolver.getResolver() })


console.log(process.argv)

//console.log(fs.readFileSync(process.argv.pop()))

void (async () => {
    await did.authenticate()

    const video_id = process.argv.pop();
    const fsPath = process.argv.pop();


    console.log(fsPath, video_id)
    console.log(mongoDB)
    let video = await mongoDB.Video.findOne({ _id: video_id, status: "encoding_preparing" });
    if (video === null) {

        return console.log({ "status": "FAIL" })
    }
    if (video.upload_type === "ipfs") {
        const { cid } = await cluster.addData(fs.createReadStream(fsPath), {
            replicationFactorMin: 1,
            replicationFactorMax: 2
        })
        const { data } = await Axios.post(`${global.APP_ENCODER_ENDPOINT}/api/v0/gateway/pushJob`, {
            jws: await did.createJWS({
                url: `${global.APP_IPFS_GATEWAY_ENCODER}/ipfs/${cid.toString()}`,
                metadata: {
                    video_owner: video.owner,
                    video_permlink: video.permlink
                },
                storageMetadata: {
                    key: `${video.owner}/${video.permlink}/video`,
                    type: 'video',
                    app: "3speak"
                }
            })
        })
        console.log(data)
        video.filename = `ipfs://${cid.toString()}`
        video.status = "encoding_ipfs";
        video.created = Date.now();
        video.job_id = data.id
        await video.save();
        fs.unlinkSync(fsPath)
    }
    process.exit(0)
})()
