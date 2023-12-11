import mongoDB from '../mongoDB.js';
import fetch from 'node-fetch';
import srs from 'secure-random-string';
import queryString from 'query-string';
import price from 'crypto-price';
const monthlyPrice = 3.99;
const receiveAccount = "threespeakex";

import hive from '@hiveio/hive-js';
hive.api.setOptions({useAppbaseApi: true, url: 'http://api.hive.blog'})


async function getSteemFromUSD(usd) {
    let marketSteemPrice = "1";

    return Math.round(usd / parseFloat(marketSteemPrice.price) * 1000) / 1000;
}

async function checkPostingAuthority(req, res, next) {

    const [account] = await hive.api.getAccountsAsync([req.session.identity.username]);
    if (account.name) {
        let auth = account.posting.account_auths.find(x => x[0] === 'threespeak')
        if (auth !== undefined && auth.length === 2) {
            return next();
        }

        return res.render('missing_posting_auth', {
            user: req.session.user.email,
            identity: req.session.identity,
        })
    } else {
        res.status(400).end();
    }
}

async function checkPaymentRequired(req, res, next) {

    return next(); // disable monthly payments

}

async function requireLogin(req, res, next) {
    if (req.session.user) {


        let contentCreator = await mongoDB.User.findOne({user_id: req.session.user.user_id});
        //
        if (contentCreator !== null && contentCreator.banned === true) {
            const banReason = "You were permanently banned from using 3Speak for violating our Terms of Service.";
            // req.session.destroy();
            return res.render("banned", {banReason, user: contentCreator.email}) //TODO change to grab currently attached identity
        }  else if (contentCreator !== null && contentCreator.self_deleted === true) {
            const message =`No 3Speak Account found with name - ${username}`;
            return res.status(500).send({ error: message });
          }

        // try {
        //     let blacklist = await (await fetch("http://blacklist.usesteem.com/user/" + req.session.user)).json();
        //
        //     const ignore = ["nuoviso"]; //damn it
        //
        //     if (blacklist.blacklisted.includes("yoodoo") > 0 && !ignore.includes(req.session.user)) {
        //         const user = req.session.user;
        //         req.session.destroy();
        //         return res.redirect("/blacklisted?u="+user);
        //     }
        // } catch {
        if (contentCreator === null) {
            const creator = new mongoDB.User({
                user_id: req.session.user.user_id,
                email: req.session.user.email
            });
            await creator.save();
        }

        next();
        // }
    } else {
        res.redirect("/login")
    }
}

async function requireIdentity(req, res, next) {

    let contentCreator = await mongoDB.User.findOne({user_id: req.session.user.user_id});
    const lastIdentity = await mongoDB.HiveAccount.findOne({_id: contentCreator.last_identity});
    if (lastIdentity !== null) {

        if (!req.session.identity) {
            req.session.identity = await mongoDB.ContentCreator.findOne({username: lastIdentity.account});
        }

        return next();
    }

    if (req.originalUrl === '/api/request_guest_account') {
        return next();
    }

    return res.render('add_identity', {noIdentity: true, user: req.session.user.email, identity: {username: "null"}})
}

export default {
    requireLogin,
    checkPaymentRequired,
    requireIdentity,
    checkPostingAuthority
};