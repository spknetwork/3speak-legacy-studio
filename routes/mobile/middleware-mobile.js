import mongoDB from "../../mongoDB.js";
import hive from "@hiveio/hive-js";
import config from "../../consts.js";
import jwt from "jsonwebtoken";
hive.api.setOptions({ useAppbaseApi: true, url: "http://api.hive.blog" });

async function requireMobileLogin(req, res, next) {
  let user = req.session.user;
  if (user === null || user === undefined) {
    const token = req.headers['authorization'].replace("Bearer ", "");
    user = jwt.verify(token, config.AUTH_JWT_SECRET);
  }
  if (user) {
    let mobileUser = await mongoDB.MobileUser.findOne({
      user_id: user.user_id,
    });
    if (mobileUser !== null && mobileUser.banned === true) {
      const banReason =
        "You were permanently banned from using 3Speak for violating our Terms of Service.";
      return res.status(500).send({ error: banReason });
    }

    let contentCreator = await mongoDB.ContentCreator.findOne({
      username: user.user_id,
    });

    if (contentCreator !== null && contentCreator.banned === true) {
      const banReason =
        "You were permanently banned from using 3Speak for violating our Terms of Service.";
      return res.status(500).send({ error: banReason });
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

async function validateHiveContent(author, permlink) {
  return new Promise((resolve, reject) => {
    hive.api.getContent(author, permlink, function (err, result) {
      if (err) {
        return reject(err);
      } else if (typeof result === "string") {
        const data = JSON.parse(result);
        if (data.result !== undefined && data.result.length === 0) {
          return reject("No data found on hive chain");
        } else if (
          data.result.beneficiaries !== undefined &&
          Array.isArray(data.result.beneficiaries)
        ) {
          return resolve(data.result.beneficiaries);
        } else {
          return reject("No data found on hive chain");
        }
      } else if (result.result !== undefined && result.result.length === 0) {
        return reject("No data found on hive chain");
      } else if (
        result.beneficiaries !== undefined &&
        Array.isArray(result.beneficiaries)
      ) {
        return resolve(result.beneficiaries);
      } else {
        return reject("No data found on hive chain");
      }
    });
  });
}

async function validateBeneficiaries(author, permlink) {
  try {
    const beneficiaries = await validateHiveContent(author, permlink);
    const sagar = beneficiaries.filter(function (o) {
      return o.account === "sagarkothari88";
    });
    const spkBeneficiary = beneficiaries.filter(function (o) {
      return o.account === "spk.beneficiary";
    });
    const threespeakleader = beneficiaries.filter(function (o) {
      return o.account === "threespeakleader";
    });
    if (
      sagar.length > 0 &&
      threespeakleader.length > 0 &&
      threespeakleader.length > 0
    ) {
      const sagarBenWeight = sagar[0].weight;
      const spkBeneficiaryWeight = spkBeneficiary[0].weight;
      const threespeakleaderWeight = threespeakleader[0].weight;
      if (
        sagarBenWeight !== undefined &&
        spkBeneficiaryWeight !== undefined &&
        threespeakleaderWeight !== undefined
      ) {
        if (
          sagarBenWeight < 100 ||
          spkBeneficiaryWeight < 850 ||
          threespeakleaderWeight < 100
        ) {
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export default {
  requireMobileLogin,
  validateBeneficiaries,
};
