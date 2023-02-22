import config from "../config/index.js";
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
import {fork} from 'child_process'


const { Ed25519Provider } = Ed25519ProviderImport;

const { DID } = DIDImport;

Object.assign(global, { fetch, File, Blob, FormData })

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}





//console.log(fs.readFileSync(process.argv.pop()))

void (async () => {
    await did.authenticate()

   


    
    let videos = await mongoDB.Video.find({ _id: video_id, status: "encoding_preparing", upload_type: "ipfs" });
    for(let vid of videos) {
      var child = fork('./scripts/encoderUpload.js', [
                    vid.local_filename,
                    vid._id
                ], {
                    detached: false
                });
    }
    process.exit(0)
})()
