import AWS from 'aws-sdk';
// const { config } = require("./config/index.js");
import config from "./config/index.js";


const SQS = new AWS.SQS({
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretKey,
    region: AWS_REGION,
});

export default {
    SQS,
    helper: {
        getEncodingJob: video => {
            return {
                permlink: video.permlink,
                filename: video.filename,
                thumbnail: video.thumbnail
            }
        },
        sendMessage: async (queue, message) => {
            const parameter = {
                MessageBody: typeof message === 'string' ? message : JSON.stringify(message),
                QueueUrl: (await SQS.getQueueUrl({QueueName: queue}).promise()).QueueUrl,
            };
            return SQS.sendMessage(parameter).promise()
        },
        receiveMessage: async (queue) => {
            const parameter = {
                QueueUrl: (await SQS.getQueueUrl({QueueName: queue}).promise()).QueueUrl
            }

            return SQS.receiveMessage(parameter).promise()
        },
        deleteMessage: async (queue, ReceiptHandle) => {
            const parameter = {
                QueueUrl: (await SQS.getQueueUrl({QueueName: queue}).promise()).QueueUrl,
                ReceiptHandle
            }

            return SQS.deleteMessage(parameter).promise()
        }

    }
};
