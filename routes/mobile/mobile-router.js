import express, { json } from "express";
var router = express.Router();
import middleware from "./middleware-mobile.js";
import mongoDB from "../../mongoDB.js";
import jwt from "jsonwebtoken";
import config from "../../consts.js";
import randomstring from "randomstring";
import path from "path";
import { fork } from "child_process";
import hive from "@hiveio/hive-js";
import { Cluster } from "@nftstorage/ipfs-cluster";
import fs from "fs";
import Axios from "axios";
import moment from 'moment-timezone';

hive.api.setOptions({
  useAppbaseApi: true,
  url: `${HIVE_DEFAULT_NODE_PREFIX}://${HIVE_DEFAULT_NODE}`,
});

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

function getUserFromRequest(req) {
  let user = req.session.user;
  if (user === null || user === undefined) {
    const token = req.headers['authorization'].replace("Bearer ", "");
    try {
      user = jwt.verify(token, config.AUTH_JWT_SECRET);
    } catch (e) {
      console.error(`Error verifying token: ${token}`);
    }
  }
  return user;
}

router.get("/login", async (req, res) => {
  try {
    const { access_token = null } = req.query;
    const { username = null } = req.query;
    const { client = null } = req.query;
    const { hivesigner = null } = req.query;
    if (username == null) {
      return res.status(500).json({
        error: "Please provide username.",
      });
    }

    if (!req.session.user && access_token === null) {
      let publicKey = null;
      if (client === null) {
        if (hivesigner === "true") {
          const [account] = await hive.api.getAccountsAsync(['hivesigner']);
          publicKey = account.posting.key_auths[0][0];
        } else {
          const [account] = await hive.api.getAccountsAsync([username]);
          publicKey = account.posting.key_auths[0][0];
        }
        // instead simple string comparison, we'll have an array of clients along with the public key provided by them
        // for their trusted clients. once we have those in place, we will update this code.
      } else if (client === "mobile") {
        // mobile client will have private key of following public key. with it, mobile-client will be able to decrypt it
        // it will be used for hive-keychain-based-sessions on mobile-client
        publicKey = config.MOBILE_APP_KEYCHAIN_BASED_SESSION_PUBLIC_KEY;
      } else {
        return res.status(500).send({ error: `Unsupported client found in the request.` });
      }
      var dataToSign = { user_id: username, network: "hive", banned: false };
      var token = jwt.sign(dataToSign, config.AUTH_JWT_SECRET, {
        expiresIn: "30d",
      });
      console.log(`token is ${token}`);
      var encryptedToken = hive.memo.encode(
        config.HIVE_PRIVATE_KEY,
        publicKey,
        `#${token}`
      );
      return res.send({
        memo: encryptedToken,
      });
    } else {
      if (access_token !== null) {
        try {
          const userProfile = jwt.verify(access_token, config.AUTH_JWT_SECRET);
          console.log(userProfile);
          req.session.user = userProfile;
          let newUserProfile = userProfile;
          delete newUserProfile["iat"];
          delete newUserProfile["exp"];
          return res.send(newUserProfile);
        } catch (e) {
          return res.status(500).send({ error: `Error is ${e.toString()}` });
        }
      } else {
        if (req.session.user) {
          let newUserProfile = req.session.user;
          // if session is expired.
          if (Date.now() >= newUserProfile["exp"] * 1000) {
            delete req.session.user;
            return res.status(500).send({ error: "session expired" });
          } else {
            delete newUserProfile["iat"];
            delete newUserProfile["exp"];
            return res.send(newUserProfile);
          }
        } else {
          return res.status(500).send({ error: `Unknown error.` });
        }
      }
    }
  } catch (e) {
    console.log("ERROR: login-mobile", {
      error: e.toString(),
    });
    console.log(e);
    return res.status(500).send({ error: `Error is ${e.toString()}` });
  }
});

router.post(
  "/api/upload_info",
  middleware.requireMobileLogin,
  async (req, res) => {
    let user = getUserFromRequest(req);
    const { app = null } = req.query;
    if (user === undefined || user === null) {
      return res.status(500).send({ error: "Either session/token expired or session/token not found in request." });
    }
    try {
      let video = new mongoDB.Video();
      let videoCount = await mongoDB.Video.countDocuments({
        owner: user.user_id,
      });
      if (videoCount === 0) {
        video.firstUpload = true;
      }
      video.originalFilename = req.body.oFilename;
      video.permlink = randomstring
        .generate({ length: 10, charset: "alphabetic" })
        .toLowerCase();
      video.duration = parseFloat(req.body.duration);
      video.size = parseFloat(req.body.size);
      if (req.body.width !== undefined) {
        video.width = parseFloat(req.body.width);
      }
      if (req.body.height !== undefined) {
        video.height = parseFloat(req.body.height);
      }
      video.owner = req.body.owner;
      video.created = Date.now();
      video.upload_type = "ipfs";
      video.status = "uploaded";
      const text = `${req.body.owner} - ${req.body.oFilename}`;
      video.title = text;
      video.description = text;
      video.local_filename = req.body.filename;
      if (req.body.isReel !== undefined && req.body.isReel === true) {
        video.isReel = true;
      }
      //  move thumbnail to ipfs
      let thumbnail = path.resolve(
        `${config.TUS_UPLOAD_PATH}/${req.body.thumbnail}`
      );
      const { cid: thumbnailCid } = await cluster.addData(
        fs.createReadStream(thumbnail),
        {
          metadata: {
            key: `${video.owner}/${video.permlink}/thumbnail`,
          },
          //replicationFactorMin: 2,
          //replicationFactorMax: 3,
        }
      );
      fs.unlinkSync(thumbnail);
      // Save video details
      video.thumbnail = `ipfs://${thumbnailCid}`;
      if (app === null) {
        video.fromMobile = true;
      } else {
        video.app = app;
      }
      // put it in queue
      console.log(video);
      if (video.local_filename) {
        let filepath;
        if (
          video.local_filename.includes("/") ||
          video.local_filename.includes("\\")
        ) {
          return res.status(500).send({ error: "File name must not include any slashes." });
        } else {
          filepath = path.resolve(
            `${config.TUS_UPLOAD_PATH}/${video.local_filename}`
          );
        }
        // this line is important
        var child = fork("./scripts/encoderUpload.js", [filepath, video._id], {
          detached: false,
        });
        video.status = "encoding_preparing";
        await video.save();
        res.send(video);
      } else {
        console.error("Error video does not have local_filename");
        return res.send({
          status: "FAIL",
        });
      }
    } catch (e) {
      console.log("ERROR: /api/upload/newUpload", {
        username: user.user_id,
      });
      console.log(e);
      return res.status(500).send({ error: `Error is ${e.toString()}` });
    }
  }
);

router.post(
  "/api/update_info",
  middleware.requireMobileLogin,
  async (req, res) => {
    let userObject = getUserFromRequest(req);
    if (userObject === undefined || userObject === null) {
      return res.status(500).send({ error: "Either session/token expired or session/token not found in request." });
    }
    const user = userObject.user_id;
    const videoId = req.body.videoId;
    let videoEntry = await mongoDB.Video.findOne({ owner: user, _id: videoId });
    if (!videoEntry) {
      return res.status(500).send({ error: "video not found" });
    }
    videoEntry.title = req.body.title;
    videoEntry.description = req.body.description;
    videoEntry.isNsfwContent = req.body.isNsfwContent;
    videoEntry.tags = req.body.tags;
    if (typeof req.body.tags === "string" && req.body.tags.length > 0) {
      videoEntry["tags_v2"] = req.body.tags.split(",");
    } else {
      videoEntry["tags_v2"] = [];
    }
    if (typeof req.body.communityID === "string" && req.body.communityID.length > 0) {
      videoEntry.community = req.body.communityID;
    }
    if (typeof req.body.beneficiaries === "string" && req.body.beneficiaries.length > 0) {
      videoEntry.beneficiaries = req.body.beneficiaries;
    }
    if (typeof req.body.rewardPowerup === "boolean") {
      videoEntry.rewardPowerup = req.body.rewardPowerup;
    }
    if (typeof req.body.declineRewards === "boolean") {
      videoEntry.declineRewards = req.body.declineRewards;
    }
    console.log(`request body: ${JSON.stringify(req.body)}`);
    console.log("Before moving thumbnail");
    if (req.body.thumbnail !== undefined) {
      console.log("trying to move thumbnail");
      //  move thumbnail to ipfs
      let thumbnail = path.resolve(
        `${config.TUS_UPLOAD_PATH}/${req.body.thumbnail}`
      );
      const { cid: thumbnailCid } = await cluster.addData(
        fs.createReadStream(thumbnail),
        {
          metadata: {
            key: `${videoEntry.owner}/${videoEntry.permlink}/thumbnail`,
          },
          replicationFactorMin: 2,
          replicationFactorMax: 3,
        }
      );
      fs.unlinkSync(thumbnail);
      videoEntry.thumbnail = `ipfs://${thumbnailCid}`;
    }
    await videoEntry.save();
    console.log(videoEntry);
    res.send(videoEntry);
  }
);

router.post(
  "/api/update_thumbnail",
  middleware.requireMobileLogin,
  async (req, res) => {
    let userObject = getUserFromRequest(req);
    if (userObject === undefined || userObject === null) {
      return res.status(500).send({ error: "Either session/token expired or session/token not found in request." });
    }
    const user = userObject.user_id;
    const videoId = req.body.videoId;
    if (videoId === undefined) {
      return res.status(500).send({ error: "VideoId not found in request body" });
    }
    let videoEntry = await mongoDB.Video.findOne({ owner: user, _id: videoId });
    if (!videoEntry) {
      return res.status(500).send({ error: "video not found" });
    }
    if (req.body.thumbnail !== undefined) {
      console.log('trying to move thumbnail');
      //  move thumbnail to ipfs
      let thumbnail = path.resolve(
        `${config.TUS_UPLOAD_PATH}/${req.body.thumbnail}`
      );
      const { cid: thumbnailCid } = await cluster.addData(
        fs.createReadStream(thumbnail),
        {
          metadata: {
            key: `${videoEntry.owner}/${videoEntry.permlink}/thumbnail`,
          },
          replicationFactorMin: 2,
          replicationFactorMax: 3,
        }
      );
      fs.unlinkSync(thumbnail);
      videoEntry.thumbnail = `ipfs://${thumbnailCid}`;
      await videoEntry.save();
      res.send(videoEntry);
    } else {
      return res.status(500).send({ error: "Thumbnail not found in request body" });
    }
  }
);

router.get(
  "/api/my-videos",
  middleware.requireMobileLogin,
  async (req, res) => {
    let userObject = getUserFromRequest(req);
    if (userObject === undefined || userObject === null) {
      return res.status(500).send({ error: "Either session/token expired or session/token not found in request." });
    }
    const user = userObject.user_id;
    let query = { owner: user };

    const statusOptions = [
      "uploaded",
      "encoding",
      "published",
      "deleted",
      "encoding_failed",
      "encoding_queued",
    ];
    let { status = undefined } = req.query;
    if (status !== undefined) {
      if (statusOptions.includes(status)) {
        query.status = status;
      }
    }

    if (!query.status) {
      query.status = { $ne: "uploaded" };
    }

    let videos = await mongoDB.Video.aggregate([
      {
        $match: query,
      },
      {
        $sort: {
          created: -1,
        },
      },
    ]);

    let vidsOut = [];
    for (let video of videos) {
      video.thumbUrl = video?.thumbnail?.includes("ipfs://")
        ? `${APP_IPFS_GATEWAY}/ipfs/${video.thumbnail.replace("ipfs://", "")}`
        : `${APP_VIDEO_CDN_DOMAIN}/${video.thumbnail}`;
      if (video.status === "encoding_ipfs") {
        //Fetch external encoding data.
        if (video.job_id) {
          try {
            const { data: info } = await Axios.get(
              `${global.APP_ENCODER_ENDPOINT}/api/v0/gateway/jobstatus/${video.job_id}`
            );
            console.log(info);
            video.encoding_status = info;
            const job = info.job;
            if (job.status === "complete") {
              video.visible_status = "complete";
            } else if (job.status == "running") {
              video.visible_status = `${Math.round(job.progress.pct)}%`;
            } else if (job.status === "queued") {
              video.visible_status = `Queued. Position in queue ${info.rank}`;
            } else if (job.status === "uploading") {
              video.visible_status = `Finalizing`;
            } else if (job.status === "failed" || job.status === "encoding_failed") {
              video.visible_status = `Failed`;
            } else {
              video.visible_status = job.status;
            }
          } catch (ex) {
            console.log(ex);
            video.visible_status = "Status unavailable";
          }
        }
      } else {
        if (video.status === "uploaded") {
          video.visible_status = "Uploaded";
        } else if (video.status === "scheduled") {
          video.visible_status = "Scheduled";
        } else if (video.status === "encoding") {
          video.visible_status =
            "Encoding - To Check the status of the encoding please reload the page";
        } else if (video.status === "saving") {
          video.visible_status = "Finalizing";
        } else if (video.status === "deleted") {
          video.visible_status = "Deleted";
        } else if (video.status === "published") {
          video.visible_status = "Published";
        } else if (video.status === "encoding_failed") {
          video.visible_status =
            "Encoding Failed. If you want this video to be published please upload it again.";
        } else if (video.status === "encoding_queued") {
          video.visible_status =
            'Queued for encoding<br><b class="text-danger">Please do not attempt to re-upload unless the status reads "Encoding Failed"</b>';
        } else if (video.status === "encoding_preparing") {
          video.visible_status = "Preparing Encoding";
        }
      }
      vidsOut.push(video);
    }
    res.send(vidsOut);
  }
);

router.post(
  "/api/my-videos/iPublished",
  middleware.requireMobileLogin,
  async (req, res) => {
    let userObject = getUserFromRequest(req);
    if (userObject === undefined || userObject === null) {
      return res.status(500).send({ error: "Either session/token expired or session/token not found in request." });
    }
    const user = userObject.user_id;
    console.log(`User name is ${user}`);
    const videoId = req.body.videoId;
    console.log(`video id is ${videoId}`);
    let video = await mongoDB.Video.findOne({ owner: user, _id: videoId });
    if (!video) {
      return res.status(500).send({ error: "video not found" });
    }
    if (video.steemPosted || video.status === "published") {
      return res.send({ success: true, data: video });
    }
    try {
      const doesPostHaveValidBeneficiaries =
        await middleware.hasValidPostBeneficiariesAndPayout(video.owner, video.permlink);
      if (doesPostHaveValidBeneficiaries) {
        video.steemPosted = true;
        video.status = "published";
        await video.save();
        return res.send({ success: true, data: video });
      } else {
        // Marking video as failed because user didn't add necessary beneficiaries to the video-post on hive chain.
        video.status = "encoding_failed";
        await video.save();
        res.status(500).send({ error: 'Insufficient beneficiaries found.' });
      }
    } catch (e) {
      // upon not finding data on hive-chain, it will simply throw an error to client.
      // it won't mark video as failed.
      console.error(e.message);
      return res.status(500).send({ error: e });
    }
  }
);

function getSkipValueFromRequest(req) {
  let skip = req.query.skip;
  if (typeof parseInt(skip) === 'number' && !isNaN(parseInt(skip))) {
    skip = parseInt(skip)
  } else {
    skip = 0
  }
  return skip;
}
async function sendFeedResponse(req, res, query) {
  const queryLimit = 50;
  let skip = getSkipValueFromRequest(req);
  if (req.query.shorts === 'true') {
    query.isReel = true;
  }
  query.status = 'published';
  const feed = await mongoDB.Video.find(query).sort('-created').skip(skip).limit(queryLimit);
  res.send(feed);
}

router.get("/api/feed/@:username", async (req, res) => {
  let subs = await mongoDB.Subscription.find({ userId: req.params.username });
  let subchannels = [];
  for (let i = 0; i < subs.length; i++) {
    subchannels.push(subs[i].channel);
  }
  await sendFeedResponse(req, res, { owner: { $in: subchannels } });
});

router.get("/api/feed/home", async (req, res) => {
  await sendFeedResponse(req, res, { recommended: true });
});

router.get("/api/feed/trending", async (req, res) => {
  let lastWeek = moment().subtract(7,'day').asDate()
  await sendFeedResponse(req, res, { created: {$gt: lastWeek} });
});

router.get("/api/feed/new", async (req, res) => {
  await sendFeedResponse(req, res, { });
});

router.get("/api/feed/first", async (req, res) => {
  await sendFeedResponse(req, res, { firstUpload: true, owner: {$ne: 'guest-account'} });
});

router.get("/api/feed/user/@:user", async (req, res) => {
  await sendFeedResponse(req, res, { owner: req.params.username });
});

router.get("/api/feed/community/@:community", async (req, res) => {
  await sendFeedResponse(req, res, { hive: req.params.community });
});

export default router;
