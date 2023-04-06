// import { config } from "../config/index.js"
import config from "../config/index.js";
import rateLimit from 'express-rate-limit';
import express from 'express';
var router = express.Router();
import middleware from './middleware.js';
import sc from 'hivesigner';
import mongoDB from '../mongoDB.js';
import moment from 'moment-timezone';
import jwt from 'jsonwebtoken';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });
import AWS from 'aws-sdk';
import paymentHelper from '../payment_helper/calculateUploadedTime.js';
import timePriceHelper from '../payment_helper/calculateCostByLength.js';
import langdetect from 'langdetect';
const ep = new AWS.Endpoint(process.env.WASABI_ENDPOINT);
import consts  from './../consts.js';
import xss from 'xss';
import ipfsCluster from 'ipfs-cluster-api';
import FormData from 'form-data'
import { Cluster } from '@nftstorage/ipfs-cluster'
import sqs from '../aws.js';
import rabbit from '../rabbit.js';
import { binary_to_base58 } from 'base58-js';
//import { FormData } from '@web-std/form-data'
import { File, Blob } from '@web-std/file'
import initLanguages from './data/podcastLanguages.js'
import initCategories from './data/podcastCategories.js'

import Ed25519ProviderImport from "key-did-provider-ed25519";
import Crypto from 'crypto'
import KeyResolver from 'key-did-resolver'
import DIDImport from 'dids'
import Axios from 'axios'
import { CID } from 'multiformats/cid'
import {fork} from 'child_process'
const { Ed25519Provider } = Ed25519ProviderImport;

const { DID } = DIDImport;

Object.assign(global, { fetch, File, Blob, FormData })


let cluster;
if(process.env.ENV === "dev") {
    cluster = new Cluster(process.env.IPFS_CLUSTER_URL, {
        headers: {
            Authorization: process.env.IPFS_CLUSTER_AUTH 
        }
    })

} else {
    cluster = new Cluster('http://localhost:9094', {
    })
}


console.log(DID)
let key = new Ed25519Provider(Buffer.from(config.appEncoderPrivate, 'base64'))
const did = new DID({ provider: key, resolver: KeyResolver.getResolver() })
did.authenticate().then(() => console.log(did.id));


const s3 = new AWS.S3({
    endpoint: ep,
    signatureVersion: 'v4',
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: process.env.WASABI_SECRET_KEY,
    region: process.env.WASABI_REGION
});

const admins = [
    "9816e1a1-eae1-4303-8723-6a82e3b49f5e"
]

const s3AWS = new AWS.S3({
    region: AWS_REGION,
    signatureVersion: 'v4',
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretKey,
});


const cloudfront = new AWS.CloudFront({
    signatureVersion: 'v4',
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretKey,
    region: AWS_REGION
});
import md5 from 'md5';
import randomstring from 'randomstring';
// const api = sc.Initialize(config.AUTH);
import uniqueSlug from 'unique-slug';
import slug from 'slug';
import hive from '@hiveio/hive-js';
hive.api.setOptions({ useAppbaseApi: true, url: `${HIVE_DEFAULT_NODE_PREFIX}://${HIVE_DEFAULT_NODE}` })
import steem from 'steem';
steem.api.setOptions({ useAppbaseApi: true, url: `${HIVE_DEFAULT_NODE_PREFIX}://${HIVE_DEFAULT_NODE}` })
import sql from 'mssql';
import fetch from '@web-std/fetch'

import { format as sprintf } from 'util';
import assert from 'assert';
import axios from 'axios';
import dhive from '@hiveio/dhive';
import fs from 'fs';

var client = new dhive.Client(["https://api.hive.blog", "https://api.hivekings.com", "https://anyx.io", "https://api.openhive.network"]);

router.get("/verify", middleware.requireLogin, async (req, res) => {
    let { id = null } = req.query;

    let query = {
        memo: id,
        status: "pending"
    };

    let payment = await mongoDB.ContentCreatorPayment.findOne(query);

    if (payment === null) {
        return res.redirect("/")
    }

    res.render("verifyPayment", { id, user: req.session.user })

});

router.get("/health", (req, res) => {
    res.status(200).end();
});

router.get('/', (req, res) => {
    res.redirect("/dashboard");
});

/*router.get('/my-wallet', middleware.requireLogin, middleware.requireIdentity, async (req, res,) => {
    res.render('my-wallet')
})*/
router.get('/my-videos', middleware.requireLogin, middleware.requireIdentity, async (req, res,) => {

    let query = { owner: req.session.identity.username };

    if (query.owner === 'guest-account') {
        query.userId = req.session.user.user_id;
    }

    const statusOptions = ["uploaded", "encoding", "published", "deleted", "encoding_failed", "encoding_queued"];
    let { status = undefined } = req.query;
    if (status !== undefined) {
        if (statusOptions.includes(status)) {
            query.status = status;
        }
    }

    if (!query.status) {
        query.status = { $ne: "uploaded" }
    }

    let videos = await mongoDB.Video.aggregate([
        {
            $match: query
        },
        {
            $sort: {
                created: -1
            }
        }
    ]);

    let vidsOut = []
    for (let video of videos) {
        video.thumbUrl = video?.thumbnail?.includes('ipfs://') ? `${APP_IPFS_GATEWAY}/ipfs/${video.thumbnail.replace('ipfs://', '')}` : `${APP_VIDEO_CDN_DOMAIN}/${video.thumbnail}`
        if (video.status === "encoding_ipfs") {
            //Fetch external encoding data.
            if (video.job_id) {
                try {
                    const { data: info } = await Axios.get(`${global.APP_ENCODER_ENDPOINT}/api/v0/gateway/jobstatus/${video.job_id}`)
                    console.log(info)
                    video.encoding_status = info
                    const job = info.job
                    if (job.status === "complete") {
                        video.visible_status = 'complete'
                    } else if (job.status == "running") {
                        video.visible_status = `${Math.round(job.progress.pct)}%`
                    } else if (job.status === "queued") {
                        video.visible_status = `Queued. Position in queue ${info.rank}`
                    } else if (job.status === "uploading") {
                        video.visible_status = `Finalizing`
                    } else if (job.status === "assigned") {
                        video.visible_status = `Assigned to encoding node`
                    } else if (job.status === "failed" || job.status === "encoding_failed") {
                        video.visible_status = `Encoding Failed. If you want this video to be published please upload it again.`
                    } else {
                        video.visible_status = job.status
                    }
                    let status = video.visible_status;
                    if (video.fromMobile === true) {
                        status = `${status}<br>Uploaded from Mobile.`;
                        status = `${status}<br>Using Mobile App, You can change thumbnail, title, description, once video encoding is complete.`;
                        status = `${status}<br><a href='https://ecency.com/@sagarkothari88/itymluvaci'>Know more</a>`;
                    }
                } catch (ex) {
                    console.log(ex)
                    video.visible_status = "Status unavailable"
                }
            }
        } else {
            if (video.status === "uploaded") {
                video.visible_status = "Uploaded"
            } else if (video.status === "scheduled") {
                video.visible_status = "Scheduled"
            } else if (video.status === "encoding") {
                video.visible_status = "Encoding - To Check the status of the encoding please reload the page"
            } else if (video.status === "saving") {
                video.visible_status = "Finalizing"
            } else if (video.status === "deleted") {
                video.visible_status = 'Deleted'
            } else if (video.status === "published") {
                video.visible_status = "Published"
            } else if (video.status === 'encoding_failed') {
                video.visible_status = "Encoding Failed. If you want this video to be published please upload it again."
            } else if (video.status === "encoding_queued") {
                video.visible_status = "Queued for encoding<br><b class=\"text-danger\">Please do not attempt to re-upload unless the status reads \"Encoding Failed\"</b>"
            } else if (video.status === "encoding_preparing") {
                video.visible_status = "Preparing Encoding"
            }
        }
        video.createdISO = video.created.toISOString()
        video.publishISO = video?.publish_data?.toISOString()
        vidsOut.push(video)
    }

    res.render("my-videos", {
        videos: vidsOut,
        status: status === undefined ? "any" : status,
        user: req.session.user.email,
        identity: req.session.identity,
        maintenance: fs.existsSync(__dirname + "/../.work"),
        showInfo: req.query.showinfo === "true"
    });
});
router.get('/my-videos/boosts', middleware.requireLogin, middleware.requireIdentity, async (req, res,) => {

    let boosts = await mongoDB.VideoBoost.find({ user_id: req.session.user.user_id })

    let query = { owner: req.session.identity.username, status: 'published', score: { $gt: 0 }, isNsfwContent: false, score_boost: { $exists: false } };

    let today = new Date();
    let sevenDaysAgo = today.setDate(today.getDate() - 7);
    query.created = { $gte: new Date(sevenDaysAgo) }
    let videos = await mongoDB.Video.aggregate([
        {
            $match: query
        },
        {
            $sort: {
                created: -1
            }
        }
    ]);

    res.render("my-boosts", {
        boosts,
        videos,
        user: req.session.user.email,
        identity: req.session.identity
    });
});


router.post('/my-videos/boosts/activate', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const { boost, permlink } = req.body;

    const boostDB = await mongoDB.VideoBoost.findOne({
        permlink: { $exists: false },
        _id: boost,
        user_id: req.session.user.user_id
    });

    const video = await mongoDB.Video.findOne({
        status: 'published',
        permlink,
        score_boost: { $exists: false },
        isNsfwContent: false,
        score: { $gt: 0 }
    });

    if (boostDB === null || video === null) {
        return res.status(400).end()
    } else {
        boostDB.permlink = permlink;
        video.score_boost = boostDB.boost;
        await boostDB.save();
        await video.save();
        return res.status(200).end()
    }
});

router.post("/api/creatorlist", async (req, res) => {
    let text = req.body.text;
    let creators = await mongoDB.ContentCreator.find({ username: { $regex: text } });
    let usernames = [];
    for (let i = 0; i < creators.length; i++) {
        usernames.push(creators[i].username)
    }
    res.json({ names: usernames })
})


router.get('/live', middleware.requireLogin, middleware.checkPaymentRequired, async (req, res,) => {

    if (req.session.identity.username === 'guest-account') {
        return res.redirect("/")
    }

    if (!fs.existsSync(__dirname + '/../.workLS')) {

        // try {
        //     let key = await mongoDB.getLiveStreamKey(req.session.user.user_id + "_" + req.session.identity.username)
        //     let ls = await mongoDB.Livestream.findOne({ channel: req.session.identity.username });

        //     if (ls === null) {
        //         ls = new mongoDB.Livestream({
        //             channel: req.session.identity.username,
        //             streamkey: Date.now().toString(),
        //             title: "Livestream"
        //         })
        //         await ls.save();
        //     }

        //     let region = '.eu';

        //     let botKey = await mongoDB.ChatBotToken.findOne({
        //         account: req.session.identity.username
        //     });

        //     if (botKey === null) {
        //         botKey = new mongoDB.ChatBotToken({
        //             account: req.session.identity.username,
        //             token: jwt.sign({
        //                 nickname: req.session.identity.username + ".bot",
        //                 userid: req.session.user.user_id
        //             }, config.CHAT_AUTH_SECRET, {
        //                 expiresIn: '720d'
        //             })
        //         })

        //         await botKey.save();
        //     }

        //     res.render("live", {
        //         stream: ls,
        //         user: req.session.user.email,
        //         identity: req.session.identity,
        //         noDrift: true,
        //         botKey,
        //         key,
        //         region
        //     });
        // } catch (e) {
        //     console.log(e)
        //     res.send("error")
        // }
    } else {
        return res.render('live_maintainance', {
            user: req.session.user.email,
            identity: req.session.identity
        })
    }
});
router.get('/vods', middleware.requireLogin, middleware.checkPaymentRequired, async (req, res,) => {

    if (req.session.identity.username === 'guest-account') {
        return res.redirect("/")
    }


    let vods = [];

    if (!fs.existsSync(__dirname + '/../.workLS')) {
        vods = await (await fetch(`https://${APP_LIVE_DOMAIN}/stream/` + req.session.identity.username + '/vods')).json();
    } else {
        return res.render('vod_maintainance', {
            user: req.session.user.email,
            identity: req.session.identity
        })
    }

    res.render('vods', {
        vods,
        user: req.session.user.email,
        identity: req.session.identity,
    })

});

router.get("/live/status", middleware.requireLogin, middleware.checkPaymentRequired, async (req, res) => {
    let ls = await mongoDB.Livestream.findOne({ channel: req.session.identity.username });

    if (ls === null) {
        ls = new mongoDB.Livestream({
            channel: req.session.identity.username,
            streamkey: Date.now().toString(),
            title: "Livestream"
        })
        await ls.save();
    }

    let status = await (await fetch(`https://${APP_LIVE_DOMAIN}/list`)).json();
    status = status.includes(req.session.user) ? "online" : "offline";
    // console.log(moment().tz('Europe/Berlin').subtract(30, 'seconds').toDate())
    let views = await mongoDB.LiveView.countDocuments({
        channel: req.session.identity.username,
        timestamp: { $gt: moment().tz('Europe/Berlin').subtract(30, 'seconds').toDate() }
    })


    return res.json({
        status,
        title: ls.title,
        views
    })

})

router.post("/live/save", middleware.requireLogin, middleware.checkPaymentRequired, async (req, res) => {
    let ls = await mongoDB.Livestream.findOne({ channel: req.session.identity.username });
    if (ls === null) {
        return res.status(403).json({
            error: "Livestreaming is not enabled for you!"
        });
    }

    ls.title = req.body.title;
    await ls.save();
    res.json({ status: "ok" })
});

router.get('/my-profile', middleware.requireLogin, middleware.requireIdentity, async (req, res,) => {

    if (req.session.identity.username === 'guest-account') {
        return res.redirect("/")
    }

    const [account] = await hive.api.getAccountsAsync([req.session.identity.username]);
    let cover = ''; //TODO:REPLACE

    let json = {}

    if (account.posting_json_metadata || account.json_metadata) {
        json = JSON.parse(account.posting_json_metadata || account.json_metadata)
    }

    if (json.profile) {
        cover = json.profile.cover_image;
    }

    //return res.redirect(`https://hive.blog/@${req.session.identity.username}/settings`)

    let avatar = 'https://images.hive.blog/u/' + req.session.identity.username + '/avatar';
    res.render("my-profile", {
        avatar,
        cover,
        user: req.session.user.email,
       identity: req.session.identity
    });
});

const allowedMimeTypes = /image\/(png|jpg|jpeg|gif)/;
import path from 'path';
const __dirname = path.resolve();

const upload2 = multer({
    dest: __dirname + '/../uploads/',
    limits: {
        fileSize: 512000,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.match(allowedMimeTypes) !== null) {
            cb(null, true)
        } else {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'))
        }
    }
});

router.get("/verification", async (req, res) => {
    res.render("verification", { user: req.session.user })
});

function validURL(str) {
    let pattern = new RegExp('^(https):\\/\\/[^\\s$.?#].[^\\s]*$');
    return !!pattern.test(str);
}

router.post("/verification/success", async (req, res) => {
    if (validURL(req.body.evidence)) {
        let creator = await mongoDB.ContentCreator.findOne({ username: req.session.identity.username });
        creator.awaitingVerification = true;
        creator.verificationEvidence = req.body.evidence;
        await creator.save();
        res.json({ success: true })
    } else {
        res.json({ success: false })
    }
});

router.post("/verification/social-media", async (req, res) => {
    let inboxV = new mongoDB.InboxVerification();
    inboxV.spkUser = req.session.identity.username;
    inboxV.platform = req.body.platform;
    inboxV.verifyId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    inboxV.username = req.body.username;
    await inboxV.save();
    await mongoDB.ContentCreator.updateOne({ username: req.session.identity.username }, { awaitingVerification: true }, { upsert: true });
    res.send();
});

router.get("/editor-video/:permlink", middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    let video = await mongoDB.Video.findOne({
        owner: req.session.identity.username,
        permlink: req.params.permlink
    });

    if (video === null) return res.redirect("/");

    res.render("editor-video", {
        user: req.session.user.email,
        identity: req.session.identity,
        video: video
    })
})

router.post("/editor-video/:permlink", middleware.requireLogin, async (req, res) => {
    let video = await mongoDB.Video.findOne({
        owner: req.session.identity.username,
        permlink: req.params.permlink
    });

    const { title, description, tags } = req.body;

    if (video === null) return res.status(404).json({ "error": 404 });

    if (title.length <= 5 || title.length >= 250) {
        return res.status(400).json({ "error": "title_invalid" })
    }

    if (description.length <= 1 || description.length >= 10000) {
        return res.status(400).json({ "error": "description_invalid" })
    }

    video.title = title;
    video.description = description;
    video.tags = tags;
    video.updateSteem = true;
    video.indexed = false;

    await video.save();
    res.redirect("/my-videos");
})


router.get('/video/:id/delete', async (req, res) => {
    let { id } = req.params;
    let video = await mongoDB.Video.findOne({
        permlink: id,
        owner: req.session.identity.username,
        // channel: 'test-account'
    });

    if (video === null) {
        return res.redirect("/my-videos")
    }

    video.status = "deleted";
    video.indexed = false;
    await video.save();
    return res.redirect("/my-videos");
});

router.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

router.post("/api/video/edit", middleware.requireLogin, middleware.checkPaymentRequired, upload.single("thumbnail"), async (req, res) => {
    let { id = null, title = null, description = null, tags = null, is3CJContent = null, donations = null, language = null, category = null, community = null, communityID = null, declineRewards = false, rewardPowerup = false, isNsfwContent = false, publish_type = 'publish', publish_data = 0, beneficiaries = '[]', postToHiveBlog = null } = req.body;

    try {
        if (!["publish", "schedule"].includes(publish_type)) {
            publish_type = 'publish'
        }

        if (publish_type === "schedule") {
            let parsed = parseInt(publish_data);
            if (isNaN(parsed)) {
                publish_type = 'publish'
            }

            publish_data = new Date(parsed * 1000)
        }

        const user = req.session.identity.username;

        if (user === "guest-account") {
            publish_type = 'publish'
            beneficiaries = "[]"
            is3CJContent = false;
            declineRewards = true;
            donations = false;
            communityID = 'hive-181335';
            community = 'Threespeak';
        }

        let video = await mongoDB.Video.findOne({ owner: user, _id: id });
        let creator = await mongoDB.ContentCreator.findOne({ username: user });
        if (video === null) {
            console.log(`NOTE: ${user} failed /api/video/edit`)
            return res.json({ "status": "FAIL" })
        }

        if (is3CJContent === true) {
            if (creator.isCitizenJournalist === false) {
                return res.json({ "status": "You are not approved as a citizen journalist." })
            }
        }

        let validBenef = true;
        let hiveReqCount = 0;
        let usedBeneficiaries = [];
        if (language === 'en' || language == null) {
            language = langdetect.detectOne(description)
            if (language === 'en') {
                language = langdetect.detectOne(title)
            }
        }
        let reducedUpvote = creator.reducedUpvote
        if (language === 'bn') {
            reducedUpvote = true;
        }

        if (user !== 'guest-account') {

            let errormsg = ''


            try {
                let jsonBenef = JSON.parse(beneficiaries);
                let totalWeight = 1100;

                let [account] = await hive.api.getAccountsAsync([user]);
                if (account && account.json_metadata) {
                    let json = JSON.parse(account.json_metadata)
                    if (json.beneficiaries) {
                        if (Array.isArray(json.beneficiaries)) {
                            let benefactors = json.beneficiaries.filter(x => x.name !== 'spk.delegation').filter(x => x.name && x.label)
                            for (let bene of benefactors) {
                                totalWeight += bene.weight
                                usedBeneficiaries.push(bene.name)
                            }
                        }
                    }
                }

                jsonBenef.forEach((e, i) => {
                    if (!(e.account && e.weight)) {
                        errormsg = 'Must include account and weight.'
                        validBenef = false;
                    }
                    if (usedBeneficiaries.includes(e.account)) {
                        errormsg = 'Included same beneficiary twice.'
                        validBenef = false
                    }
                    usedBeneficiaries.push(e.account)
                    if (e.length > 2) {
                        errormsg = 'Included unecessary info.'
                        validBenef = false;
                    }
                    if (typeof e.account !== 'string' || typeof e.weight !== 'number') {
                        errormsg = 'Incorrect types for weight or account.'
                        validBenef = false;
                    }
                    if (e.account.length > 16 || e.account.length < 3) {
                        errormsg = 'Account name length invalid.'
                        validBenef = false;
                    }
                    hiveReqCount += 1;
                    hive.api.getAccountsAsync([e.account], (err, result) => {
                        if (result.length === 0) {
                            errormsg = 'Account does not exist on hive.'
                            validBenef = false;
                        }
                        totalWeight += e.weight;
                        if (totalWeight > 10000 || totalWeight < 0) {
                            errormsg = 'Invalid weight'
                            validBenef = false;
                        }
                        hiveReqCount -= 1;
                    })
                });

            } catch (e) {
                console.log(e.message)
                errormsg = e.message
                validBenef = false;
            }
            while (hiveReqCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log(hiveReqCount);
            }
            if (!validBenef) {
                console.log(`NOTE: ${user} failed /api/video/edit beneifiary`)
                return res.json({ "status": errormsg });
            }
        }

        let thumbnail = req.file;
        //let key = thumbnail.filename + "." + thumbnail.mimetype.replace("image/", "");
        const { cid: thumbnailCid } = await cluster.addData(fs.createReadStream(thumbnail.path), {
            metadata: {
                key: `${video.owner}/${video.permlink}/thumbnail`
            },
            //replicationFactorMin: 2,
            //replicationFactorMax: 3
        })
        fs.unlinkSync(thumbnail.path);

        video.title = title;
        video.description = description.replace(/twitch.tv/gmi, '');
        video.tags = tags;
        video["tags_v2"] = tags.split(',');
        video.thumbnail = `ipfs://${thumbnailCid}`;
        video.is3CJContent = is3CJContent;
        video.isNsfwContent = isNsfwContent;
        video.donations = donations;
        video.declineRewards = declineRewards;
        video.rewardPowerup = rewardPowerup;
        video.category = category;
        video.language = language;
        video.community = community;
        video.hive = communityID;
        video.upvoteEligible = creator.upvoteEligible;
        video.reducedUpvote = reducedUpvote;
        video.beneficiaries = beneficiaries;

        video.publish_type = publish_type;
        if (publish_type === 'schedule') {
            video.publish_data = publish_data
        }

        if (user === 'guest-account') {
            video.userId = req.session.user.user_id;
        }

        video.save((e) => {
            console.log(`NOTE: ${user}/${video.permlink} video saved`)
            console.log("VIDEO SAVED", video, e)
            res.json({ "status": "Ok" })
        });

        /*s3.upload({
            Key: key,
            Body: fs.readFileSync(thumbnail.path),
            Bucket: 'v--03-eu-west.3speakcontent.online',
            ACL: "public-read"
        }, async (err, data) => {
            if (err) {
                console.log("VIDEO_EDIT_THUMBNAIL_UPLOAD_FAIL", { key }, req.body, err)
                res.json({ "status": "FAIL" })
            } else {
                fs.unlinkSync(thumbnail.path);
                video.title = title;
                video.description = description.replace(/twitch.tv/gmi, '');
                video.tags = tags;
                video["tags_v2"] = tags.split(',');
                video.thumbnail = key;
                video.is3CJContent = is3CJContent;
                video.isNsfwContent = isNsfwContent;
                video.donations = donations;
                video.postToHiveBlog = postToHiveBlog;
                video.declineRewards = declineRewards;
                video.rewardPowerup = rewardPowerup;
                video.category = category;
                video.language = language;
                video.community = community;
                video.hive = communityID;
                video.upvoteEligible = creator.upvoteEligible;
                video.reducedUpvote = reducedUpvote;
                video.beneficiaries = beneficiaries;

                video.publish_type = publish_type;
                if (publish_type === 'schedule') {
                    video.publish_data = publish_data
                }

                if (user === 'guest-account') {
                    video.userId = req.session.user.user_id;
                }

                video.save((e) => {
                    console.log("VIDEO SAVED", video, e)
                    res.json({ "status": "Ok" })
                });
            }
        });*/
    } catch (ex) {
        console.log(`ERROR: id: ${id}`)
        console.log(ex)
    }
});

router.get('/_refreshIdentity', middleware.requireLogin, async (req, res) => {

    try {
        const user = await mongoDB.User.findOne({ user_id: req.session.user.user_id })

        if (admins.includes(req.session.user.user_id)) {
            let lastIdentity;
            if (req.query.identity) {
                lastIdentity = await mongoDB.ContentCreator.findOne({ username: req.query.identity });
                if (lastIdentity !== null) {
                    req.session.identity = lastIdentity;
                    req.session.override = 'on';
                    const isVerifiedAccount = await mongoDB.HiveAccount.findOne({ account: req.query.identity })
                    user.last_identity = isVerifiedAccount ? isVerifiedAccount._id : user.last_identity;
                    await user.save()
                }
            }
            return res.redirect("/dashboard")
        } else {
            if (req.query.identity) {
                let identity = await mongoDB.HiveAccount.findOne({
                    user_id: user._id,
                    account: req.query.identity
                });

                if (identity !== null) {
                    let lastIdentity = await mongoDB.ContentCreator.findOne({ username: identity.account });
                    if (lastIdentity !== null) {
                        req.session.identity = lastIdentity;
                        user.last_identity = identity._id;
                        await user.save();
                    }
                }
            }

            res.redirect("/dashboard")
        }
    } catch (e) {
        console.log(e)
        res.redirect("/dashboard")
    }

})

router.post("/api/video/queue", middleware.requireLogin, middleware.checkPaymentRequired, async (req, res) => {
    const { id = null } = req.body;
    const user = req.session.identity.username;
    try {


        // if (user === "guest-account") {{
        //
        //     let video = await mongoDB.Video.findOne({owner: user, _id: id, status: "uploaded"});
        //     if (video === null) {
        //         return res.json({"status": "FAIL"})
        //     }
        //     video.status = "published";
        //
        //     await video.save();
        //     res.json({"status": "Ok"})
        // }}

        let video = await mongoDB.Video.findOne({ owner: user, _id: id, status: "uploaded" });


        const thumbnailCount = await mongoDB.Video.countDocuments({
            thumbnail: video.thumbnail
        })

        let allowedByRep = false
        try {
            
            const data = await client.database.getAccounts([user])
            
            const rep = repLog10(data[0].reputation)

            if(rep > 30) {
                allowedByRep = true
            }
            
        } catch {

        }

        
        if(thumbnailCount > 5 && !allowedByRep) {
            return res.send({ "status": "FAIL" })
        }

        if (video === null) {
            console.log("ERROR: /api/video/queue", {
                msg: "EMPTY VIDEO",
                owner:
                    user, _id: id
            })
            return res.send({ "status": "FAIL" })
        }
        if (video.upload_type === "ipfs") {
            console.log(video)
            if(video.local_filename) {
                let filepath;
                if(video.local_filename.includes('/') || video.local_filename.includes('\\')) {
                    filepath = video.local_filename;
                } else {
                    filepath = path.resolve(`./uploads/${video.local_filename}`)
                }
                var child = fork('./scripts/encoderUpload.js', [
                    filepath,
                    video._id
                ], {
                    detached: false
                });
                video.status = "encoding_preparing"
                video.created = Date.now();
            } else {
                console.error("Error video does not have local_filename! " + video._id)
                video.status = "encoding_failed"
                await video.save()
                return res.send({
                    status: "FAIL"
                })
            }

        } else {
            video.status = "encoding_queued";
            video.created = Date.now();
        }

        //let job = sqs.helper.getEncodingJob(video)
        //await rabbit.store('video_encoding', job)

        await video.save();
        res.send({ "status": "Ok" })
    } catch (ex) {
        console.log("ERROR: /api/video/queue", {
            msg: "OTHER ERROR 2",
            owner: user,
            _id: id
        })
        console.log(ex)
        return res.send({ "status": "FAIL" })
    }
});


router.post('/api/update_profile', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const { avatar, cover } = req.body;
    if (avatar === cover === undefined) {
        return res.status(400).json({ success: false })
    }


    if (avatar !== undefined) {
        if (avatar.startsWith('https://hive.s3.eu-central-1.wasabisys.com/profile/' + req.session.identity.username + '/')) {
            //let url = avatar.replace('https://hive.s3.eu-central-1.wasabisys.com/profile/', 'https://profile.cdn.3speakcontent.online/')

            const baseUrl = await binary_to_base58(Buffer.from(avatar));

            let url = `https://images.hive.blog/p/${baseUrl}?format=jpeg&mode=fit&width=512&height=512`;

            const [account] = await hive.api.getAccountsAsync([req.session.identity.username]);

            try {

                if (account.posting_json_metadata === "") {
                    account.posting_json_metadata = "{}"
                }

                if (account.json_metadata === "") {
                    account.json_metadata = "{}"
                }

                let json = JSON.parse(account.posting_json_metadata || account.json_metadata)

                if (json.profile) {
                    json.profile.profile_image = url;
                }

                if (!json.profile) {
                    json.profile.profile_image = url;
                }


                let tx = [["account_update2", {
                    "account": req.session.identity.username,
                    "json_metadata": "",
                    "posting_json_metadata": JSON.stringify(json)
                }]]


                let data = await hive.broadcast.sendAsync({ operations: tx }, { posting: "5JSh2h8PBAHTec57832X2EgP7m4w869YumZVzdLKW6EPZ77J9F9" });
                return res.send(data)
            } catch (e) {
                console.log(e)
                return res.status(400).send({})
            }
        }
    }
    if (cover !== undefined) {
        if (cover.startsWith('https://hive.s3.eu-central-1.wasabisys.com/profile/' + req.session.identity.username + '/')) {
            //const url = cover.replace('https://hive.s3.eu-central-1.wasabisys.com/profile/', 'https://profile.cdn.3speakcontent.online/')

            const baseUrl = await binary_to_base58(Buffer.from(cover));

            let url = `https://images.hive.blog/p/${baseUrl}?format=jpeg&mode=fit&width=1920&height=240`;

            const [account] = await hive.api.getAccountsAsync([req.session.identity.username]);

            try {

                if (account.posting_json_metadata === "") {
                    account.posting_json_metadata = "{}"
                }

                if (account.json_metadata === "") {
                    account.json_metadata = "{}"
                }

                let json = JSON.parse(account.posting_json_metadata || account.json_metadata)

                if (json.profile) {
                    json.profile.cover_image = url;
                }

                if (!json.profile) {
                    json.profile.cover_image = url;
                }

                let tx = [["account_update2", {
                    "account": req.session.identity.username,
                    "json_metadata": "",
                    "posting_json_metadata": JSON.stringify(json)
                }]]


                let data = await hive.broadcast.sendAsync({ operations: tx }, { posting: process.env.THREESPEAK_POSTING_WIF });
                return res.send(data)
            } catch (e) {
                console.log(e)
                return res.status(400).send({})
            }
        }
    }

    res.json({
        success: true
    })

})

router.post('/api/upload_image', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const myBucket = 'hive';
    const myKey = 'profile/' + req.session.identity.username + '/' + randomstring.generate({
        length: 64,
        charset: 'alphabetic'
    }) + '.jpg';
    console.log(myKey)
    const signedUrlExpireSeconds = 60 * 6 * 72;
    const url = s3.getSignedUrl('putObject', {
        Bucket: myBucket,
        Key: myKey,
        Expires: signedUrlExpireSeconds,
        ContentType: 'image/jpeg'
    });

    res.send({
        upload_to: url
    })
})

router.post("/api/upload/video", middleware.requireLogin, middleware.requireIdentity, upload.single("file"), async (req, res) => {
    try {
        const video = JSON.parse(req.body.video);
        const user = req.session.identity.username;
        const { _id: id = null } = video;
        console.log(video)
        let videoEntry = await mongoDB.Video.findOne({ owner: user, _id: id });

        if (videoEntry === null) {
            console.log(`ERROR: /api/upload/video`, {
                owner: user,
                _id: id
            })
            return res.json({ "status": "FAIL" })
        }
        console.log('saving video!!')
        const videoFile = req.file
        console.log(videoFile)
        videoEntry.local_filename = videoFile.filename
        /*const { cid } = await cluster.addData(fs.createReadStream(videoFile.path), {
            metadata: {
                key: videoFile.path
            },
            expireAt: moment().add(1, 'M'),
            replicationFactorMin: 1,
            replicationFactorMax: 2,
        })

        console.log({
            cid
        })

        fs.unlinkSync(videoFile.path)

        videoEntry.filename = `ipfs://${cid}`

        await videoEntry.save() */

        await videoEntry.save()

        return res.send({
        })
    } catch (ex) {
        console.log(`/api/upload/video`, ex)
        return res.send({ cid: null })
    }
})

router.post('/api/upload/tus-callback', async (req, res) => {
    const upload_data = req.body;

    if(upload_data.Upload.ID !== '') {
        const metadata = upload_data.Upload.MetaData;
        const video_id = metadata.video_id;

        //const upload_path = upload_data.Upload.Storage.Path;
        const video = await mongoDB.Video.findOne({
            _id: video_id,
            status: 'uploaded'
        })
        console.log(video.save)
        if(!video) {
            return res.status(400).send({
                error: "Video is invalid"
            })
        }
        if(!video.local_filename) {
            video.local_filename = upload_data.Upload.Storage.Path
            await video.save()
        }
    }

    res.send({})
})

router.post("/api/upload/prepare", middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    try {

        /*if (process.env.ENV === 'dev') {
            const secret_key = "6Le5G3MaAAAAABZhg0Uz_i7wmXNwtG22bizUBwaR";
            const reqUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${req.body.token}`;

            const data = await (await fetch(reqUrl, { method: 'post' })).json();

            if (data.success === false || data.score < 0.65) {

                return res.json({
                    success: false
                });

            }
        }*/


        let upload_type;
        let url;
        const myKey = randomstring.generate({
            length: 64,
            charset: 'alphabetic'
        }) + '.mp4';

        const contentCreator = await mongoDB.ContentCreator.findOne({
            username: req.session.identity.username
        })

        let video = new mongoDB.Video();

        if (contentCreator.ipfsBeta === true) {
            if(global.RESUMABLE_UPLOADS) {
                upload_type = 'ipfs_resumable'
                url = global.APP_TUS_ENDPOINT
            } else {
                upload_type = 'ipfs'
                url = '/api/upload/video'
                video.filename = null
            }
        } else {
            upload_type = 's3'
            const myBucket = process.env.WASABI_BUCKET;
            const signedUrlExpireSeconds = 60 * 6 * 72;
            url = s3.getSignedUrl('putObject', {
                Bucket: myBucket,
                Key: myKey,
                Expires: signedUrlExpireSeconds,
                ContentType: 'video/mp4'
            });
            video.filename = myKey;
        }


        if (req.session.identity.username === "guest-account") {
            video.userId = req.session.user.user_id
        }

        let videoCount = await mongoDB.Video.countDocuments({ owner: req.session.identity.username });
        if (videoCount === 0) {
            video.firstUpload = true;
        }

        video.originalFilename = req.body.oFilename;
        video.permlink = randomstring.generate({
            length: 8,
            charset: 'alphabetic'
        }).toLowerCase();
        video.duration = parseFloat(req.body.duration);
        video.size = parseFloat(req.body.size);
        video.owner = req.session.identity.username;
        video.created = Date.now();
        video.upload_type = upload_type.split('_')[0]; // Get root type of upload
        await video.save();

        // let cost = await timePriceHelper(video.duratpulion);
        video.encoding_price_steem = "0.000";
        await video.save();

        if (upload_type === "ipfs") {
            console.log(`NOTE: Creating IPFS video`, {
                signed_url: url,
                filename: myKey,
                duration: req.body.duration,
                original_filename: req.body.oFilename,
                status: "ok",
                video,
                upload_type
            })
        }

        res.send({
            signed_url: url,
            filename: myKey,
            duration: req.body.duration,
            original_filename: req.body.oFilename,
            status: "ok",
            video,
            upload_type
        })
    } catch (e) {
        console.log("ERROR: /api/upload/prepare", {
            username: req.session.identity.username
        })
        console.log(e)
        res.status(500).end()
    }
});

router.get("/login", (req, res) => {
    const { access_token = null } = req.query;
    if (!req.session.user && access_token === null) {

        return res.redirect(AUTH_API_URL + '?redirect_url=' + AUTH_API_REDIRECT_URL + '&client_id=' + consts.AUTH_API_CLIENT_ID)

    } else {

        if (access_token !== null) {
            try {
                const userProfile = jwt.verify(access_token, consts.AUTH_JWT_SECRET)
                console.log(userProfile)
                req.session.user = userProfile
                return res.redirect('/dashboard')
            } catch (e) {
                return res.redirect('/dashboard')
            }
        }

        res.redirect('/dashboard')
    }
});


router.post("/api/tos", middleware.requireLogin, async (req, res) => {
    const { user } = req.session;
    let exist = await mongoDB.GuideLinesAccept.findOne({ username: user });
    if (exist === null) {
        exist = new mongoDB.GuideLinesAccept({
            username: user
        });
        await exist.save()
    }
    res.status(200).end();
});
router.get("/api/witness", middleware.requireLogin, async (req, res) => {
    const creator = await mongoDB.ContentCreator.findOne({ username: req.session.identity.username });
    creator.askWitnessVote = false;
    await creator.save();
    res.status(200).end();
});

router.get("/dashboard", middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const videoCount = await mongoDB.Video.countDocuments({
        owner: req.session.identity.username,
        status: { $in: ["encoding", "published", "deleted"] }
    });

    try {

    } catch {

    }
    let subCountRaw = await hive.api.getFollowCountAsync(req.session.identity.username)

    const subCount = subCountRaw.follower_count;
    const viewCount = await mongoDB.View.countDocuments({ author: req.session.identity.username });
    const creator = await mongoDB.ContentCreator.findOne({ username: req.session.identity.username });

    const [account] = await hive.api.getAccountsAsync([req.session.identity.username]);

    const askWitnessVotes = account.witness_votes.includes("threespeak") === false && creator.askWitnessVote === true;
    console.log(account.witness_votes.includes("threespeak"), creator.askWitnessVote)

    let nextPayment = new Date();
    nextPayment.setUTCMonth(nextPayment.getUTCMonth() + 1);
    nextPayment.setUTCFullYear(9999);

    let promotion = false;
    if (creator.CJPromotion === 0) {
        // offered promotion to citizen journalist
        if (!creator.isCitizenJournalist) {
            promotion = true
        } else {
            creator.CJPromotion = 1;
            creator.save()
        }
    }

    let speakSpkContent = []

    let speakContent = await hive.api.getDiscussionsByBlogAsync({ limit: 5, tag: 'threespeak' });

    let spkContent = await hive.api.getDiscussionsByBlogAsync({ limit: 5, tag: 'spknetwork' });

    let spkchatContent = await hive.api.getDiscussionsByBlogAsync({ limit: 5, tag: 'spknetwork.chat' });

    speakSpkContent = speakContent.concat(
        spkContent.concat(
            spkchatContent
        )
    )


    function shuffle(array) {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }


    speakSpkContent = shuffle(speakSpkContent);

    let larynxDetails
    try {
        larynxDetails = await axios.get('https://spktoken.dlux.io/@' + req.session.identity.username)

        larynxDetails = larynxDetails.data.drop

        let last_claim = parseInt('A', 16)

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        larynxDetails.last_claim = months[parseInt(larynxDetails.last_claim, 16) - 1]
        larynxDetails.claimable = larynxDetails.availible.amount / 1000
    } catch {

    }


    res.render("index", {
        promotion,
        creator,
        videoCount,
        user: req.session.user.email,
        identity: req.session.identity,
        subCount,
        viewCount,
        nextPayment,
        askWitnessVotes,
        speakSpkContent,
        larynxDetails
    })

});

router.post("/warning-read", async (req, res) => {
    let creator = await mongoDB.ContentCreator.findOne({ username: req.session.identity.username });
    creator.warningPending = false;
    await creator.save();
    res.send({ ok: 200 });
});

router.post("/journalist-upgrade", async (req, res) => {
    let creator = await mongoDB.ContentCreator.findOne({ username: req.session.identity.username });
    let agreed = parseInt(req.body.agreed);
    if (creator.CJPromotion === -1 || creator.CJPromotion === 1) {
        res.json({ error: "Already accepted/rejected promotion." })
    } else {
        if (agreed === 1) {
            creator.CJPromotion = 1;
            creator.isCitizenJournalist = true;
        } else if (agreed === 0) {
            creator.CJPromotion = -1;
        }
        await creator.save();
        res.send();
    }
});

router.get("/upload", middleware.requireLogin, middleware.requireIdentity, middleware.checkPostingAuthority, async (req, res) => {

    if (fs.existsSync(__dirname + "/../.work") && !['wehmoen', 'dgtest123'].includes(req.session.identity.username)) {
        return res.render("upload_maintainance", {
            user: req.session.user.email,
            identity: req.session.identity,
        });
    }

    let showWarningEncodingTime = false;

    let languages = await mongoDB.Language.find();
    let categories = await mongoDB.ContentCategory.find();
    let hiveCommunities = await mongoDB.HiveCommunity.find({}, '-_id -__v');

    let cc = await mongoDB.ContentCreator.findOne({ username: req.session.identity.username });

    if (cc !== null && cc.canUpload === false) {
        if (cc.banReason !== null) {
            if (cc.verificationRequired === true) {
                return res.render("banned", { banReason: cc.banReason, verificationRequired: true })
            } else {
                return res.render("banned", { banReason: cc.banReason })
            }
        }
        return res.render("beta_thank_you", {
            user: req.session.user.email,
            identity: req.session.identity, contentCreator: cc
        })
    }
    /*   if (req.session.user !== "sisygoboom") */

    res.render("upload", {
        user: req.session.user.email,
        display_name: req.session.display_name,
        identity: req.session.identity,
        contentCreator: cc,
        languages,
        categories,
        hiveCommunities,
        showWarningEncodingTime,
        left: 100,
        ENV: process.env.ENV
    })
});

router.get('/donations', middleware.requireLogin, async (req, res) => {
    let donation_accounts = await mongoDB.Donation.find({ username: req.session.identity.username })
    let all_accounts = await mongoDB.DonationAccountTypes.find()

    for (let account of donation_accounts) {
        for (let crypto of all_accounts) {
            if (crypto.ticker === account.ticker) {
                account.img = crypto.img
            }
        }
    }

    res.render('donations', {
        donation_accounts,
        all_accounts,
        user: req.session.user.email,
        identity: req.session.identity,
    })
})

router.post('/donations', middleware.requireLogin, async (req, res) => {
    /*TODO: xxs*/
    mongoDB.Donation.create({ username: req.session.identity.username, ticker: xss(req.body.ticker), address: xss(req.body.address) })
    res.send()
})

router.post('/donations/delete', middleware.requireLogin, async (req, res) => {
    await mongoDB.Donation.deleteOne({ _id: req.body.address })
    res.send()
})

router.post('/settings/toggleTitleAutofill', middleware.requireLogin, async (req, res) => {
    await mongoDB.ContentCreator.updateOne({ username: req.session.identity.username }, { $set: { autoFillTitle: req.body.autofill } });
    res.send()
});

router.post("/api/creator/vote/day", middleware.requireLogin, async (req, res) => {
    let creator = req.session.identity.username;

    creator = await mongoDB.ContentCreator.findOne({ 'username': creator });

    if (creator === null || creator.canProxyUpvote === null || creator.upvoteDay === null) {
        res.json({
            error: 'Not able to upvote.'
        });
        return;
    }

    let upvoteDay = creator.upvoteDay;
    let date = new Date();

    if (date.getDate() > upvoteDay) {
        date.setMonth(date.getMonth() + 1)
    } else if (date.getDate() === upvoteDay) {
        res.json({
            upvoteEnabled: true
        });
        return;
    }

    date.setDate(upvoteDay);
    date.setHours(0, 0, 0, 0);

    res.json({
        date: date,
    })
});


router.post('/api/completeIdentityChallenge', middleware.requireLogin, async (req, res) => {
    let { signed_message, keychain } = req.body;

    const wif_memo = keychain === 'true' ? config.threeSpeakPostWif : config.authWifMemo;

    const wif_pub = config.authPubMemo;

    let contentCreator = await mongoDB.User.findOne({ user_id: req.session.user.user_id });

    function getUserPub(pubkeys) {
        return pubkeys.pubkey === wif_pub ? pubkeys.otherpub : pubkeys.pubkey
    }

    try {
        const decoded = hive.memo.decode(wif_memo, signed_message)
        const message = JSON.parse(decoded.substr(1));
        const pubKeys = hive.memo.getPubKeys(signed_message)

        const [account] = await hive.api.getAccountsAsync([message.account])

        let signatureValid = false;

        for (const key_auth of account[message.authority].key_auths) {
            if (key_auth[0] === pubKeys[0]) {
                signatureValid = true
            }
        }

        if (signatureValid) {
            const challenge = await mongoDB.HiveAccountChallenge.findOne({
                account: message.account,
                user_id: req.session.user.user_id,
                challenge: message.message,
                key: message.authority
            })

            if (challenge !== null) {
                let identity = await mongoDB.HiveAccount.findOne({
                    account: message.account,
                    user_id: contentCreator._id
                });

                if (identity === null) {
                    identity = new mongoDB.HiveAccount({
                        account: message.account,
                        user_id: contentCreator._id
                    });

                    await identity.save();
                }

                contentCreator.last_identity = identity._id;

                let cc = await mongoDB.ContentCreator.findOne({ username: message.account })


                if (cc != null) {
                    req.session.identity = cc
                } else {
                    cc = new mongoDB.ContentCreator({
                        username: message.account,
                        hidden: false
                    });
                    await cc.save();
                    req.session.identity = cc
                }
                // risky.

                await contentCreator.save();
                return res.json({
                    success: true
                })
            }
        }

        return res.json({ success: false, error: 'signature invalid' })
    } catch (e) {
        console.log(e);
        return res.json({ success: false, error: 'signed message invalid' })
    }
})

router.get('/api/identityChallenge', middleware.requireLogin, async (req, res) => {
    const { account, authority } = req.query;
    let key = authority;
    let challenge = await mongoDB.HiveAccountChallenge.findOne({
        account,
        user_id: req.session.user.user_id,
        key
    })

    if (challenge === null) {
        challenge = new mongoDB.HiveAccountChallenge({
            account,
            key,
            user_id: req.session.user.user_id,
            challenge: randomstring.generate({
                length: 48
            })
        })
        await challenge.save();
    }

    res.json(challenge)
})


router.get('/identities', middleware.requireLogin, async (req, res) => {
    const user = await mongoDB.User.findOne({ user_id: req.session.user.user_id })
    let identities = await mongoDB.HiveAccount.find({ user_id: user._id });

    res.render('identities', {
        user: req.session.user.email,
        identity: req.session.identity,
        identities,
        isAdmin: admins.includes(req.session.user.user_id)
    })
})

router.get('/addIdentity', middleware.requireLogin, async (req, res) => {
    return res.render('add_identity', {
        user: req.session.user.email,
        identity: req.session.identity,
        newUser: false
    })
})


router.get('/api/request_guest_account', middleware.requireLogin, async (req, res) => {
    const user = await mongoDB.User.findOne({ user_id: req.session.user.user_id })
    const cc = await mongoDB.ContentCreator.findOne({ username: "guest-account" })
    const identities = await mongoDB.HiveAccount.find({ user_id: user._id });

    if (identities.length > 0) {
        return res.send("assert identities length > 0")
    }

    let identity = new mongoDB.HiveAccount({
        account: 'guest-account',
        user_id: user._id
    });

    await identity.save();

    user.last_identity = identity._id;

    await user.save();

    req.session.identity = cc;

    res.redirect("/dashboard")


})

router.get('/api/createAccount', middleware.requireLogin, async (req, res) => {
    return res.send({
        disabled: true
    })
    const user = await mongoDB.User.findOne({ user_id: req.session.user.user_id })
    const identities = await mongoDB.HiveAccount.find({ user_id: user._id });

    if (identities.length > 10) {
        return res.redirect("https://direct.ident.3speak.tv/2/signup")
    }
    try {
        const { data } = await Axios.post('https://hiveonboard.com/api/tickets', {
            "accessToken": config.hot
        })

        return res.redirect('https://hiveonboard.com/create-account?ref=threespeak&redirect_url=https://studio.3speak.tv/dashboard&ticket=' + data.ticket)
    } catch (ex) {
        console.log(ex)
    }
})

const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000 * 12, // 12 hour window
    max: 3, // start blocking after 3 requests
    message:
        "Too many accounts created from this IP, please try again after an hour"
});

router.get('/api/onboard', createAccountLimiter, async (req, res) => {

    return res.redirect("https://direct.ident.3speak.tv/2/signup")

    function getReferralByDate() {
        return ''
    }

})


router.post('/api/publish', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {

    if (req.body.body.trim().length === 0 || req.body.title.trim().length === 0) {
        res.status(500).json({
            error: "Please enter a title and a post."
        })
    }

    function getOperations(title, body) {

        const operations = [];

        operations.push([
            'comment', {
                parent_author: '',
                parent_permlink: 'hive-181335',
                author: req.session.identity.username,
                permlink: (uniqueSlug(title) + '-' + slug(title)).toLowerCase(),
                title: title,
                body: body,
                json_metadata: JSON.stringify({
                    tags: ['livestream'],
                    app: '3speak/0.3.0',
                    app_original: '3speak/0.3.0',
                    type: "3speak/livestream"
                })
            }
        ]);

        operations.push(['comment_options', {
            author: req.session.identity.username,
            permlink: operations[0][1].permlink,
            max_accepted_payout: '100000.000 SBD',
            percent_steem_dollars: 10000,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: [[0, {
                beneficiaries: [
                    { account: 'threespeakwallet', weight: 1100 }
                ]
            }]]
        }])

        operations.push(['custom_json', {
            required_posting_auths: ["threespeak", req.session.identity.username],
            required_auths: [],
            id: '3speak-live',
            json: JSON.stringify({
                author: req.session.identity.username,
                permlink: operations[0][1].permlink,
                title: title
            })
        }])

        return operations;

    }

    async function tryPublish(operations) {
        try {
            return hive.broadcast.sendAsync({
                operations
            }, { posting: config.privKey });
        } catch (e) {
            return e;
        }
    }

    try {

        let ops = getOperations(req.body.title, req.body.body);

        let result = await tryPublish(ops);

        if (result.id) {
            res.json({ error: null })
        } else {
            res.status(500).json({
                error: e.message
            })
        }


    } catch (e) {
        res.status(500).json({
            error: e.message
        })
    }
})


router.get('/my-wallet', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const username = req.session.identity.username

    const getAccount = await hive.api.getAccountsAsync([username]);

    let larynxDetails = await axios.get('https://spktoken.dlux.io/@' + username)

    larynxDetails = larynxDetails.data

    let larynxBalance = larynxDetails.balance / 1000

    let larynxRunners = await axios.get('https://spkinstant.hivehoneycomb.com/markets')

    larynxRunners = Object.keys(larynxRunners.data.markets.node)

    let runnerStatus = false


    if (larynxRunners.includes(username)) runnerStatus = true

    const vestingShares = getAccount["0"].vesting_shares;
    const delegatedVestingShares = getAccount["0"].delegated_vesting_shares;
    const receivedVestingShares = getAccount["0"].received_vesting_shares;

    const dynamicGlobalProps = await hive.api.getDynamicGlobalPropertiesAsync();
    const totalVestingShares = dynamicGlobalProps.total_vesting_shares;
    const totalVestingFund = dynamicGlobalProps.total_vesting_fund_hive;

    const hivePower = hive.formatter.vestToSteem(vestingShares, totalVestingShares, totalVestingFund);
    const delegatedHivePower = hive.formatter.vestToSteem((receivedVestingShares.split(' ')[0] - delegatedVestingShares.split(' ')[0]) + ' VESTS', totalVestingShares, totalVestingFund);


    const totalHive = parseFloat(getAccount[0].balance.split(' ')[0]) + hivePower


    const exchangeRate = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=hive%2Chive_dollar&vs_currencies=usd');

    const hiveInDollars = totalHive * exchangeRate.data.hive.usd
    const hbdInDollars = parseFloat(getAccount[0].balance.split(' ')[0]) * exchangeRate.data.hive_dollar.usd

    const estimatedAccountValue = hiveInDollars + hbdInDollars

    // vesting withdrawal manager

    const pendingVestWithdraw = getAccount["0"].to_withdraw
    const nextVestingWithdrawal = getAccount[0].next_vesting_withdrawal

    const vestingWithdrawalRate = getAccount[0].vesting_withdraw_rate

    const vestingWithdrawalHive = hive.formatter.vestToSteem(vestingWithdrawalRate, totalVestingShares, totalVestingFund).toFixed(3);

    let pendingVestWithdrawStat

    if (pendingVestWithdraw > 0) {
        pendingVestWithdrawStat = true
    } else {
        pendingVestWithdrawStat = false
    }

    let savingsWithdrawStat
    const pendingSavingsWithdrawal = getAccount[0].savings_withdraw_requests

    if (pendingSavingsWithdrawal > 0) {
        savingsWithdrawStat = true
    } else {
        savingsWithdrawStat = false
    }


    const todayDate = new Date()

    const withdrawalTimeDiff = new Date(nextVestingWithdrawal).getTime() - todayDate.getTime()

    const withdrawalDayDiff = withdrawalTimeDiff / (1000 * 3600 * 24);

    let finalTimeInterval

    if (withdrawalDayDiff > 1.0) {
        finalTimeInterval = `${Math.round(withdrawalDayDiff)} days`
    }

    if (withdrawalDayDiff < 1) {
        finalTimeInterval = `${Math.round(withdrawalTimeDiff)} hrs`
    }

    // vesting withdrawal manager



    const rewardHive = getAccount[0].reward_hive_balance
    const rewardHBD = getAccount[0].reward_hbd_balance
    const rewardVesting = getAccount[0].reward_vesting_hive

    const walletData = {
        hiveBalance: parseFloat(getAccount[0].balance).toFixed(3),
        hbdBalance: parseFloat(getAccount[0].hbd_balance).toFixed(3),
        hbdSavings: parseFloat(getAccount[0].savings_hbd_balance).toFixed(3),
        hivePower: parseFloat(hivePower).toFixed(3),
        delegatedHivePower: parseFloat(delegatedHivePower).toFixed(3),
        estimatedAccountValue: parseFloat(estimatedAccountValue).toFixed(3),
        pendingVestWithdraw,
        pendingVestWithdrawStat,
        nextVestingWithdrawal,
        vestingWithdrawalRate,
        finalTimeInterval,
        vestingWithdrawalHive,
        savingsWithdrawStat,
        rewardHive,
        rewardHBD,
        rewardVesting
    }


    res.render('my-wallet', {
        user: req.session.user.email,
        identity: req.session.identity,
        walletData,
        larynxBalance,
        larynxLocked: larynxDetails.gov / 1000,
        runnerStatus
    })
})

router.post('/api/hivesigner_trf', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const from = req.body.from
    const to = req.body.to
    const amount = req.body.amount
    const memo = req.body.memo

    try {
        const op = ['transfer', {
            from: from,
            to: to,
            amount: `${amount} HIVE`,
            memo: memo
        }];

        const send = await sc.sendOperation(op, { callback: `http://${APP_STUDIO_DOMAIN}/my-wallet` });


        res.json({ send })
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})

router.post('/api/hivesigner_stake', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const from = req.body.from
    const to = req.body.to
    const amount = req.body.amount

    try {

        const op = ['transfer_to_vesting', {
            from: from,
            to: to,
            amount: `${amount} HIVE`
        }];

        const send = await sc.sendOperation(op, { callback: `http://${APP_STUDIO_DOMAIN}/my-wallet` });


        res.json({ send })
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})

router.post('/api/get_vests', async (req, res) => {
    const username = req.body.username
    const amount = req.body.amount
    const hivePower = req.body.hivePower

    const getAccount = await hive.api.getAccountsAsync([username]);

    const vestingShares = getAccount["0"].vesting_shares;

    const vestPercentage = (parseFloat(amount) / parseFloat(hivePower)) * 100

    const powerDownVest = (vestPercentage / 100) * parseFloat(vestingShares)


    res.json({
        powerDownVest
    })
})

router.post('/api/hivesigner_unstake', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const username = req.body.username
    const vests = req.body.vesting_shares

    try {

        const op = ['withdraw_vesting', {
            account: username,
            vesting_shares: vests + ' VESTS'
        }];

        const send = await sc.sendOperation(op, { callback: `http://${APP_STUDIO_DOMAIN}/my-wallet` });


        res.json({ send })
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})

router.post('/api/hivesigner_delegate', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const delegator = req.body.from
    const delegatee = req.body.to
    const vesting_shares = req.body.vesting_shares

    try {

        const op = ["delegate_vesting_shares", {
            "delegator": delegator,
            "delegatee": delegatee,
            "vesting_shares": vesting_shares
        }];

        const send = await sc.sendOperation(op, { callback: `http://${APP_STUDIO_DOMAIN}/my-wallet` });


        res.json({ send })
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})

router.post('/api/hivesigner_trf_hbd', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {
    const from = req.body.from
    const to = req.body.to
    const amount = req.body.amount
    const memo = req.body.memo

    try {

        const op = ['transfer', {
            from: from,
            to: to,
            amount: `${amount} HBD`,
            memo: memo
        }];

        const send = await sc.sendOperation(op, { callback: `http://${APP_STUDIO_DOMAIN}/my-wallet` });


        res.json({ send })
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})

router.post('/api/hivesigner_trf_savings', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {

    const from = req.body.from
    const to = req.body.to
    const amount = req.body.amount

    try {

        const op = ['transfer_to_savings', {
            "from": from,
            "to": to,
            "amount": parseFloat(amount).toFixed(3) + " HBD",
            "memo": ""
        }]

        const send = await sc.sendOperation(op, { callback: `http://${APP_STUDIO_DOMAIN}/my-wallet` });


        res.json({ send })
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})


router.post('/api/hivesigner_savings_withdraw', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {

    const from = req.body.from
    const to = req.body.to
    const amount = req.body.amount

    try {

        const op = ['transfer_from_savings', {
            "from": from,
            "request_id": 101,
            "to": to,
            "amount": parseFloat(amount).toFixed(3) + " HBD",
            "memo": ""
        }]

        const send = await sc.sendOperation(op, { callback: `http://${APP_STUDIO_DOMAIN}/my-wallet` });


        res.json({ send })
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})


router.post('/api/claim_rewards', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {

    const username = req.body.username
    const rewardHive = req.body.rewardHive
    const rewardHBD = req.body.rewardHBD
    const rewardVests = req.body.rewardVests
    const wif = hive.auth.toWif(username, req.body.wif, 'active')
    //console.log(req.body)

    try {


        const send = await hive.broadcast.claimRewardBalanceAsync(wif, username, rewardHive, rewardHBD, rewardVests);

        //console.log(send)
        //res.json({send})
    } catch (error) {
        return res.json({
            message: error.message
        })
    }
})

router.get('/podcast-profile', middleware.requireLogin, middleware.requireIdentity, async (req, res,) => {

    const username = req.session.identity.username

    const checkThis = await mongoDB.Podcast.findOne({ podcast_owner: username });

    let podcastTitle = ''
    let podcastDescription = ''
    let podcastCategories = [];
    let podcastLanguages = [];
    let podcastImage = '';

    console.log(checkThis)

    if (!checkThis || !checkThis.podcast_title) {
        podcastTitle = 'Title not set for this podcast'
    } else {
        podcastTitle = checkThis.podcast_title
    }

    if (!checkThis || !checkThis.podcast_description) {
        podcastDescription = 'Description not set for this podcast at this time'
    } else {
        podcastDescription = checkThis.podcast_description
    }

    if (!checkThis || !checkThis.podcast_image) {
        podcastImage = 'None available'
    } else {
        podcastImage = checkThis.podcast_image
    }

    if (!checkThis || !checkThis.podcast_categories) {

    } else {
        podcastCategories = checkThis.podcast_categories
    }

    if (!checkThis || !checkThis.podcast_languages) {

    } else {
        podcastLanguages = checkThis.podcast_languages
    }


    let initCategoriesString = ``;
    let initLanguagesString = ``;

    if (podcastCategories.length > 0) {
        initCategoriesString = podcastCategories.join()
    } else {
    }

    if (podcastLanguages.length > 0) {
        initLanguagesString = podcastLanguages.join()
    } else {
    }

    res.render("pod-profile", {
        user: req.session.user.email,
        identity: req.session.identity,
        podcastTitle,
        podcastDescription,
        podcastImage,
        podcastCategories,
        podcastLanguages,
        initCategories,
        initLanguages,
        initCategoriesString,
        initLanguagesString,
        initCategoriesStruct: structuredCategories
    });
});

router.post('/api/update_podcast_settings', middleware.requireLogin, middleware.requireIdentity, upload.single("thumbnail"), async (req, res) => {

    let { podcast_title, podcast_desc, categories, languages, podcast_image, thumbnail } = req.body

    const username = req.session.identity.username


    try {
        //categories = categories.replace(/(\r\n|\n|\r)/gm, "")
        categories = JSON.parse(categories)
        languages = languages.replace(/(\r\n|\n|\r)/gm, "")

        const updateOp = {
            podcast_owner: username
        };

        if (podcast_title) {
            updateOp["podcast_title"] = podcast_title
        }

        if (podcast_desc) {
            updateOp["podcast_description"] = podcast_desc
        }

        if (categories) {
            updateOp["podcast_categories"] = categories
        }

        if (languages) {
            updateOp["podcast_languages"] = [initLanguages.find(e => e.code === languages.split(',')[0]).code]
        }

        //return res.json(sendData)
        if (req.file) {
            let thumbnail = req.file;
            let key = thumbnail.filename + "." + thumbnail.mimetype.replace("image/", "");
            let fileData = fs.createReadStream(thumbnail.path)
            //const car = new Blob(fileData)
            /*const { cid } = await cluster.addData(fileData, {
                metadata: {
                    key
                }
            })
            console.log(cid)*/
            try {
                const S3Upload = await s3.upload({
                    Key: key,
                    Body: fs.readFileSync(thumbnail.path),
                    Bucket: 'v--03-eu-west.3speakcontent.online',
                    ACL: "public-read"
                })
                fs.unlinkSync(thumbnail.path);
                await S3Upload.send();
                const baseUrl = await binary_to_base58(Buffer.from(`${APP_POD_IMAGE_CDN_DOMAIN}/${key}`));

                updateOp['podcast_image'] = `https://images.hive.blog/p/${baseUrl}?format=jpeg&mode=fit&width=3000&height=3000`;
            } catch (err) {
                console.log("VIDEO_EDIT_THUMBNAIL_UPLOAD_FAIL", { key }, req.body, err)
                return res.json({ "status": "FAIL" })
            }
        }

        const sendData = await mongoDB.Podcast.updateOne({ podcast_owner: username }, updateOp, { upsert: true })
        return res.json(sendData)
    } catch (e) {
        console.log(e)
        return res.status(400).json({
            message: 'failed'
        })
    }
})

router.get('/communities', middleware.requireLogin, middleware.requireIdentity, async (req, res) => {

    let dbCommunities = await mongoDB.HiveCommunity.distinct('name', { used: true });

    res.render('communities', {
        community_threespeak: dbCommunities,
        user: req.session.user.email,
        username: req.session.identity.username,
        identity: req.session.identity,
        maintenance: fs.existsSync(__dirname + "/../.work"),
        showInfo: req.query.showinfo === "true"
    })
});

export default router;
