// import { config } from "./config/index.js"
import config from "./config/index.js";

const AUTH = {
    app: config.acct,
    callbackURL: 'https://studio.3speak.tv/login',
    // authURL: 'http://localhost:c/auth',
    authURL: 'https://studio.3speak.tv/auth',
    // callbackURL: 'http://localhost:3005/login',
    masterAccount: config.acct,
    masterAccountWif: config.acctWif
};

// const AUTH_API_URL = 'http://localhost:3000'
const AUTH_API_URL = 'https://direct.ident.3speak.tv'
const AUTH_API_CLIENT_ID = config.authApiClientId;
const AUTH_API_REDIRECT_URL = config.env === 'DEV' ? 'http://localhost:13050/login/' : 'https://studio.3speak.tv/login';
const AUTH_JWT_SECRET = config.authJwtSecret;
const CHAT_AUTH_SECRET = config.chatsecret;
const HIVE_PRIVATE_KEY = config.privKey;
const HIVE_PUBLIC_KEY = config.pubKey;
const APP_TUS_ENDPOINT = "https://uploads.3speak.tv/files";
const TUS_UPLOAD_PATH = process.env.TUS_UPLOAD_PATH;
const MOBILE_APP_KEYCHAIN_BASED_SESSION_PUBLIC_KEY = config.mobileAppKeychainBasedSessionPublicKey;

export default {
    AUTH,
    AUTH_API_URL,
    AUTH_API_REDIRECT_URL,
    AUTH_JWT_SECRET,
    AUTH_API_CLIENT_ID,
    CHAT_AUTH_SECRET,
    HIVE_PRIVATE_KEY,
    HIVE_PUBLIC_KEY,
    APP_TUS_ENDPOINT,
    TUS_UPLOAD_PATH,
    MOBILE_APP_KEYCHAIN_BASED_SESSION_PUBLIC_KEY
};
