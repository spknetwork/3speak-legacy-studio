import config  from "./config/index.js";
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import MongoStoreFactory from 'connect-mongo';
import twig from 'twig';
import multer from 'multer';
import md5 from 'md5';
import spkHelper from './spkHelper.js';
import Sentry from '@sentry/node';
import mongoDB from './mongoDB.js';


import indexRouter from './routes/index.js';
import mobileRouter from './routes/mobile/mobile-router.js';
import statisticRouter from './routes/users.js';
const __dirname = path.resolve();

const MongoStore = MongoStoreFactory(session);
Sentry.init({dsn: APP_SENTRY_DSN});

var app = express();
app.use((req, res, next) => {
    res.locals = Object.assign(res.locals, global);
    next();
})
app.set('trust proxy', true)
app.use(Sentry.Handlers.requestHandler());

// app.use((req, res, next) => {
//     if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'http') {
//         return res.redirect("https://3speak.tv" + req.originalUrl);
//     }
//     next();
// });

let host = APP_MONGO_HOST;
console.log(host)

app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {httpOnly: false, maxAge: 3600000 * 360},
    store: new MongoStore({
        url: 'mongodb://' + host
    })
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', "twig");

function formatBytes(a, b) {
    if (0 == a) return "0 Bytes";
    var c = 1024, d = b || 2, e = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
        f = Math.floor(Math.log(a) / Math.log(c));
    return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f]
}

app.engine('twig', (filePath, options, callback) => {
    twig.extendFilter('json_decode', (value, params) => {
        try {
            value = JSON.parse(value);
        } catch (e) {
            throw new twig.Error(e)
        }
        return value;
    });

    twig.extendFilter('spk_price', (value, params) => {
        return spkHelper.getTotalPrice(value).total
    });
    twig.extendFilter('removeCurrency', (value) => {
        return value.replace(' HIVE', '').replace(' HBD', '')
    })
    twig.extendFilter('avatar', (value) => {
        if (value === undefined) return 'https://v--01-profile-eu-west.3speak.online/' + md5("oauth2|Steemconnect|threespeak") + '.png';
        if ((value.match(/\|/g) || []).length !== 2) {
            value = 'oauth2|Steemconnect|' + value
        }
        return 'https://v--01-profile-eu-west.3speak.online/' + md5(value) + '.png';
    });
    twig.extendFilter('toFixed', (value, params) => {
        let decimals = params === undefined ? 0 : params[0] === undefined ? 0 : params[0];
        return value.toFixed(decimals)
    });
    twig.extendFilter('includes', (value, params) => {
        return value.includes(params[0]);
    });

    twig.extendFilter('substr', (value, params) => {
        if (typeof value === 'string') {
            return value;
        }
        let str = value.substr(params[0], params[1]);
        if (value.length >= str.length) {
            str = str.trim() + "..."
        }
        return str;
    });

    twig.extendFilter('slice', (value, params) => {
        return value.slice(params[0], params[1]);
    });
    twig.extendFilter('json_decode', (value, params) => {
        return JSON.parse(value);
    });

    twig.extendFilter('hhmmss', (value, params) => {
        var date = new Date(null);
        date.setSeconds(value); // specify value for SECONDS here
        let str = date.toISOString().substr(11, 8);
        if (str.startsWith("00:")) {
            return str.substr(3)
        }
        return str
    });

    twig.extendFilter('filesize', (value, params) => {
        return formatBytes(value)
    });

    twig.extendFilter('filter_log', (value, params) => {
        params = params || [];
        if (params.length === 0) return [];
        let filtered = [];
        value.forEach(log => {
            if (params[0].includes(log.table)) {
                filtered.push(log);
            }
        });
        return filtered;
    });

    return twig.renderFile(filePath, options, callback);
});

// app.use((req, res, next) => {
//     if (req.session.user) {
//         mongoDB.GuideLinesAccept.findOne({username: req.session.user}).then(guideLinesAccepted => {
//             res.locals.guidelinesaccepted = guideLinesAccepted !== null;
//             next();
//         });
//
//     } else {
//         next();
//     }
//
// });

app.use(logger('combined'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/mobile', mobileRouter);

app.use('/statistic', statisticRouter);

app.use(Sentry.Handlers.errorHandler());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {

    if (err instanceof multer.MulterError) {
        return res.status(500).json(err)
    }

    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    console.log(err)
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

export default app;
