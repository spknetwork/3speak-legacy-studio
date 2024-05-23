import mongoDB from "../../mongoDB.js";
import hive from "@hiveio/hive-js";
import config from "../../consts.js";
import jwt from "jsonwebtoken";
hive.api.setOptions({ useAppbaseApi: true, url: "http://api.hive.blog" });

import dhive from "@hiveio/dhive";
var client = new dhive.Client([
  "https://api.hive.blog",
  "https://anyx.io",
  "https://api.openhive.network",
]);

async function requireMobileLogin(req, res, next) {
  let user = req.session.user;
  if (user === null || user === undefined) {
    if (!("authorization" in req.headers)) {
      const banReason = "Invalid session. Please logout & login again";
      return res.status(500).send({ error: banReason });
    }
    const token = req.headers["authorization"].replace("Bearer ", "");
    try {
      user = jwt.verify(token, config.AUTH_JWT_SECRET);
    } catch (e) {
      console.error(`Error verifying token: ${token}`);
    }
  }
  if (user) {
    let mobileUser = await mongoDB.MobileUser.findOne({
      user_id: user.user_id,
    });
    if (mobileUser !== null && mobileUser.banned === true) {
      const banReason =
        "You were permanently banned from using 3Speak for violating our Terms of Service.";
      return res.status(500).send({ error: banReason });
    } else if (mobileUser !== null && mobileUser.self_deleted === true) {
      const banReason = `No 3Speak Account found with name - ${username}`;
      return res.status(500).send({ error: banReason });
    }

    let contentCreator = await mongoDB.ContentCreator.findOne({
      username: user.user_id,
    });

    if (contentCreator !== null && contentCreator.banned === true) {
      const banReason =
        "You were permanently banned from using 3Speak for violating our Terms of Service.";
      return res.status(500).send({ error: banReason });
    } else if (
      contentCreator !== null &&
      contentCreator.self_deleted === true
    ) {
      const message = `No 3Speak Account found with name - ${username}`;
      return res.status(500).send({ error: message });
    }

    if (mobileUser === null) {
      const mUser = new mongoDB.MobileUser({
        user_id: user.user_id,
      });
      await mUser.save();
    }

    if (contentCreator === null) {
      const cCreator = new mongoDB.ContentCreator({
        username: user.user_id,
      });
      await cCreator.save();
    }
    next();
  } else {
    const reason =
      "No user info found in the request. Please use /login API & attach userid to each request.";
    return res.status(500).send({ error: reason });
  }
}

async function getContent(author, permlink) {
  try {
    const data = await client.call("bridge", "get_post", {
      author: author,
      permlink: permlink,
    });
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function hasValidPostBeneficiariesAndPayout(author, permlink) {
  try {
    const content = await getContent(author, permlink);
    const beneficiaries = content.beneficiaries;
    const video = await mongoDB.Video.findOne({
      permlink: permlink,
    });
    if (video === null) {
      throw new Error("Post not found on 3Speak");
    }
    if (
      video !== null &&
      video !== undefined &&
      video.declineRewards === true &&
      content.max_accepted_payout === "0.000 HBD"
    ) {
      return true;
    }
    const fromMobile =
      video !== null && video !== undefined ? video.fromMobile : true;
    const sagar = beneficiaries.filter((o) => o.account === "sagarkothari88");
    const spkBeneficiary = beneficiaries.filter(
      (o) => o.account === "spk.beneficiary"
    );
    if (
      fromMobile !== undefined &&
      fromMobile !== null &&
      fromMobile === true
    ) {
      if (sagar.length === 0 || spkBeneficiary.length === 0) return false;
      const sagarBenWeight = sagar[0].weight;
      const spkBeneficiaryWeight = spkBeneficiary[0].weight;
      if (
        sagarBenWeight === undefined ||
        spkBeneficiaryWeight === undefined ||
        sagarBenWeight === null ||
        spkBeneficiaryWeight === null
      )
        return false;
      if (sagarBenWeight < 100 || spkBeneficiaryWeight < 1000) return false;
      return true;
    } else {
      if (spkBeneficiary.length === 0) return false;
      const spkBeneficiaryWeight = spkBeneficiary[0].weight;
      if (spkBeneficiaryWeight === undefined || spkBeneficiaryWeight === null)
        return false;
      if (spkBeneficiaryWeight < 1000) return false;
      return true;
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export default {
  requireMobileLogin,
  hasValidPostBeneficiariesAndPayout,
};
