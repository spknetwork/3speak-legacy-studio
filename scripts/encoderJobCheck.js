import config from "../config/index.js";
import "../page_conf.js";
import mongoDB from "../mongoDB.js";
import Axios from "axios";

import hive from "@hiveio/hive-js";
hive.api.setOptions({ useAppbaseApi: true });

function doWeHavePostingAuthority(username) {
  return new Promise(function (resolve, reject) {
    hive.api.getAccounts([username], function (err, result) {
      if (
        (err === null || err === undefined) &&
        result !== null &&
        result !== undefined &&
        Array.isArray(result) &&
        result.length === 1
      ) {
        const account = result[0];
        if (Array.isArray(account.posting.account_auths)) {
          account.posting.account_auths.forEach(function (item) {
            if (item[0] === "threespeak") {
              return resolve(true);
            }
          });
        }
        return resolve(false);
      } else {
        throw new Error(
          "Error while getting account information for " + username
        );
      }
    });
  });
}

void (async () => {
  setTimeout(() => {
    process.exit(0);
  }, 300 * 1000);

  const videos = await mongoDB.Video.find({
    status: "encoding_ipfs",
  });

  for (let video of videos) {
    const { data: jobInfo } = await Axios.get(
      `${global.APP_ENCODER_ENDPOINT}/api/v0/gateway/jobstatus/${video.job_id}`
    );
    const { job } = jobInfo;
    if (!job) {
      continue;
    }
    if (!job.result) {
      continue;
    }
    if (!job.result?.cid) {
      continue;
    }
    if (job.status === "complete") {
      const completed_by = job.assigned_to;
      try {
        const { data } = await Axios.get(
          `${global.APP_ENCODER_ENDPOINT}/api/v0/gateway/nodeinfo/${completed_by}`
        );
        const { node_info } = data;
        console.log(data);
        let beneficiaries = JSON.parse(video.beneficiaries); // it has to be `let` to be modifiable
        if (node_info.cryptoAccounts) {
          if (node_info.cryptoAccounts.hive) {
            if (
              !beneficiaries.find((e) => {
                return e.src === "ENCODER_PAY";
              })
            ) {
              beneficiaries.push({
                account: node_info.cryptoAccounts.hive,
                weight: 100,
                src: "ENCODER_PAY",
              });
            }
            if (video.fromMobile) {
              beneficiaries.push({
                account: "sagarkothari88",
                weight: 100,
                src: "MOBILE_APP_PAY",
              });
              // avoid duplication of same beneficiaries || removing duplicate beneficiaries
              // if video is encoded by sagar's node and uploaded from mobile
              if (
                beneficiaries.filter((ben) => {
                  return ben.account === "sagarkothari88";
                }).length > 1
              ) {
                beneficiaries = beneficiaries.filter((ben) => {
                  return ben.account !== "sagarkothari88";
                });
                beneficiaries = [
                  ...beneficiaries,
                  {
                    account: "sagarkothari88",
                    weight: 200,
                    src: "MOBILE_APP_PAY_AND_ENCODER_PAY",
                  },
                ];
              }
            }
          }
        }
        console.log(video.beneficiaries);
        video.beneficiaries = JSON.stringify(beneficiaries);
      } catch (ex) {
        console.log(ex);
      }
      video.status =
        video.publish_type === "publish" ? "published" : "scheduled";
      if (('fromMobile' in video && video.fromMobile === true) || ('app' in video && video.app !== undefined && video.app !== null)) {
        video.status = "publish_manual";

        // If we have the posting authority, we publish.
        try {
          const doWe = await doWeHavePostingAuthority(video.owner);
          if (doWe) {
            video.status = "published";
          }
        } catch (e) {
          console.error("Error while getting account information");
        }
        // - - - - - - - - - - - - - - - - - - - -
      }
      video.created = new Date(job.created_at);
      video.video_v2 = `ipfs://${job.result.cid}/manifest.m3u8`;
      video.needsHiveUpdate = true;
      console.log(video);
      await video.save();
    }
  }
  process.exit(0);
})();
