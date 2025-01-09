import config from "../config/index.js";
import { Cluster } from '@nftstorage/ipfs-cluster';
import fs from 'fs';

import fetch from '@web-std/fetch'
import { FormData } from '@web-std/form-data'
import { File, Blob } from '@web-std/file'

Object.assign(global, { fetch, File, Blob, FormData })

let cluster;
if (process.env.ENV === "dev") {
    cluster = new Cluster(process.env.IPFS_CLUSTER_URL, {
        headers: {
            Authorization: process.env.IPFS_CLUSTER_AUTH
        },
    });
} else {
    cluster = new Cluster("http://localhost:9094", {});
}

async function addFileAndGetCID(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath);
        const fileName = filePath.split('/').pop();

        const result = await cluster.add({
            path: fileName,
            content: fileContent,
        });
        const cid = result.cid['/'];
        console.log(`File added to IPFS with CID: ${cid}`);
        return cid;
    } catch (error) {
        console.error('Error adding file to IPFS:', error);
    }
}