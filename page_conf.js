//import 'dotenv/config'
// import { config } from "./config/index.js";
import config from "./config/index.js";

global.APP_PAGE_DOMAIN = config.host || '3speak.tv';
global.APP_LIVE_DOMAIN = `live.${config.appPageDomain}`;
global.APP_STUDIO_DOMAIN = `studio.3speak.tv`;
global.APP_SIGNUP_DOMAIN = `auth.3speak.tv/3/signup`;
global.APP_VIDEO_CDN_DOMAIN = 'https://threespeakcontent.b-cdn.net'
global.APP_AUDIO_CDN_DOMAIN = 'https://audio.cdn.3speakcontent.co'
global.APP_HIVE_CDN_DOMAIN = 'https://hive.cdn.3speakcontent.co'
global.APP_PAGE_PROTOCOL = process.env.PROTOCOL || 'https';
global.APP_POD_IMAGE_CDN_DOMAIN = 'https://s3.eu-central-1.wasabisys.com/v--03-eu-west.3speakcontent.online'
global.APP_IPFS_GATEWAY = 'https://ipfs-3speak.b-cdn.net'
global.APP_IPFS_GATEWAY_ENCODER = 'https://ipfs.3speak.tv'
global.APP_IPFS_CLUSTER_URL = ''
global.APP_IPFS_CLUSTER_SECRET = ''
global.APP_TUS_ENDPOINT = "https://uploads.3speak.tv/files"
global.RESUMABLE_UPLOADS = true

global.APP_ENCODER_ENDPOINT = 'https://encoder-gateway.infra.3speak.tv'
//global.APP_ENCODER_PRIVATE = config.appEncoderPrivate;

global.HIVE_DEFAULT_NODE = 'hive-api.3speak.tv';
global.HIVE_DEFAULT_NODE_PREFIX = 'https';
global.HIVE_SECURE_NODE_PREFIX = 'https';

global.APP_SENTRY_DSN = 'https://6c6db8c926ad4cb38a44f0549a0d9d5c@sentry.io/1549491'

global.APP_LEADERBOARD_USERNAME_EXCLUSION_LIST = []

global.CDN_TOS_URL = 'https://threespeakvideo.b-cdn.net/static/terms_of_service.pdf';

global.SUPPORT_EMAIL = `helpdesk@${APP_PAGE_DOMAIN}`
global.SUPPORT_PORTAL = `helpdesk.${APP_PAGE_DOMAIN}`

global.APP_REDIS_HOST = 'redis://x:threespeak@127.0.0.1:6379';
global.APP_MEMCACHED_HOST = '127.0.0.1';
global.APP_MONGO_HOST = process.env.MONGO_HOST || 'localhost:27018';
global.APP_REDDITMQ_HOST = 'amqp://manager:manager@localhost'

global.AUTH_API_REDIRECT_URL = process.env.ENV === 'dev' ? 'http://localhost:13050/login' : `https://studio.3speak.tv/login`;
global.AUTH_API_URL = `https://auth.${APP_PAGE_DOMAIN}`

global.AWS_REGION = 'eu-west-1'
global.AWS_CLOUDSEARCH_REGION = 'eu-west-1'
global.AWS_CLOUDSEARCH_SORT_ORDER = 'created desc'
global.SHOP_FEE = 2.5;
global.SOCIAL_TELEGRAM_LINK = 'https://t.me/threespeak?utm_source=3speak.tv';
global.SOCIAL_DISCORD_LINK = 'https://discord.me/3speak?utm_source=3speak.tv';
global.SOCIAL_TWITTER_LINK = 'https://twitter.com/3speakonline?utm_source=3speak.tv';
global.SOCIAL_BLOG_LINK = 'https://hive.blog/@threespeak';


export function test() {

}
