import express from 'express';
var router = express.Router();
import middleware from './middleware.js';
import generateStats from '../generateMonthlyStatistic.js';

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('you found an easter egg.');
});


router.get("/current", middleware.requireLogin, middleware.requireIdentity, async (req, res) => {

    if (req.session.identity.username === 'guest-account') {
        return res.redirect("/")
    }


    const config = await generateStats.generate(req.session.identity.username)

    res.render("statistics", {
        user: req.session.user.email,
        identity: req.session.identity, config
    })
})

export default router;
