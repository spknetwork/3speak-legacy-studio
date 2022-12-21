require('./page_conf');
const { config } = require("./config/index.js");
let CLEANABLE = [];
let CONTINUATION_TOKEN = null;
let FILES = {}
let TOTAL_SIZE = 0;

const AWS = require("aws-sdk");
const WASABI = new AWS.Endpoint(config.wasabiEndpoint);
const S3 = new AWS.S3({
    endpoint: WASABI,
    signatureVersion: 'v4',
    accessKeyId: config.wasabiAccessKeyId,
    secretAccessKey: config.wasabiSecretKey,
    region: config.wasabiRegion
});

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function list(ContinuationToken = null) {

    /**
     * @param PARAMS S3.Types.ListObjectsV2Request
     */
    const PARAMS = {
        Bucket: config.wasabiBucket,
        MaxKeys: 1000,
        Prefix: '',
        Delimiter: '/',
        ContinuationToken,

    }

   return S3.listObjectsV2(PARAMS).promise()
}

function deleteBulk() {

    console.log("=== Delete Bulk ===")

    /**
     * @param PARAMS S3.Types.DeleteObjectsRequest
     */
    let PARAMS = {
        Bucket: config.wasabiBucket,
        Delete: {
            Objects: []
        }
    }

    for (const file of CLEANABLE) {
        console.log("Delete:", file)
        PARAMS.Delete.Objects.push({
            Key: file
        })
    }

    return S3.deleteObjects(PARAMS).promise()
}

(async () => {

    do {
        FILES = await list(CONTINUATION_TOKEN);
        if (FILES.NextContinuationToken) {
            CONTINUATION_TOKEN = FILES.NextContinuationToken;
        }
        for (const file of FILES.Contents) {
            if (file.Key.indexOf('/') === -1) {
                TOTAL_SIZE += file.Size;
                CLEANABLE.push(file.Key);
                console.log('Cleanable size:', formatBytes(TOTAL_SIZE, 2), 'Cleanable total:', CLEANABLE.length, 'Cleanable found:', file.Key)
            } else {
                console.log("Ignoring:", file.Key)
            }
        }

        if (CLEANABLE.length > 500) {
            await deleteBulk();
            CLEANABLE = [];
        }

    } while (FILES.IsTruncated);

    await deleteBulk();
    CLEANABLE = [];

    console.log('Total size:', formatBytes(TOTAL_SIZE, 2));

})();
