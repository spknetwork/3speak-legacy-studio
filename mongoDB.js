import 'dotenv/config'
import mongoose from 'mongoose';
import fetch from 'node-fetch';
let host = APP_MONGO_HOST;
console.log("CONNECTING TO", host)
mongoose.connect(host, {useNewUrlParser: true, useUnifiedTopology: true });

const ContentCategorySchema = new mongoose.Schema({
    code: {type: String, required: true},
    display: {type: String, required: true},
    videoOnly: {type: Boolean, default: false}
});
const CommunitySchema = new mongoose.Schema({
    name: {type: String, required: false},
    code: {type: String, required: true},
    owner: {type: String, required: false},
    description: {type: String},
    image: {type: String},
    coverImage: {type: String},
    open: {type: Boolean},
    hive: {type: String}
});
const HiveCommunitySchema = new mongoose.Schema({
    name: {type: String},
    title: {type: String}
})
const CommunityMemberSchema = new mongoose.Schema({
    communityName: {type: String, required: true},
    username: {type: String, required: true},
    isCreator: {type: Boolean, default: false},
    isAdmin: {type: Boolean, default: false},
    isOwner: {type: Boolean, default: false}
});
const ContentCreatorSchema = new mongoose.Schema({
    username: {type: String, required: true},
    banned: {type: Boolean, required: true, default: false},
    banReason: String,
    livestreamEnabled: {type: Boolean, required: true, default: false},
    canUpload: {type: Boolean, required: true, default: true},
    canProxyUpvote: {type: Boolean, required: true, default: false},
    upvoteDay: {type: Number},
    isCitizenJournalist: {type: Boolean, required: false, default: false},
    CJPromotion: {type: Number},
    limit: {type: Number, required: false, default: 0},
    hidden: {type: Boolean, required: true, default: false},
    joined: {type: Date, required: true, default: Date.now()},
    score: {type: Number, required: true, default: 0},
    postWarning: {type: Boolean, default: false},
    askWitnessVote: {type: Boolean, default: true, required: true},
    badges: {
        type: [String],
        required: true,
        default: []
    },
    lastPayment: {type: mongoose.Types.ObjectId, default: null},
    warningPending: {type: Boolean, default: false},
    warningText: {type: String},
    upvoteEligible: {type: Boolean, default: true},
    awaitingVerification: {type: Boolean, default: false, required: true},
    verificationEvidence: {type: String, default: null},
    verified: {type: Boolean, default: false},
    verificationRequired: {type: Boolean, default: false},
    profile_image: String,
    cover_image: String,
    autoFillTitle: {type: Boolean, default: false, required: true},
    reducedUpvote: {type: Boolean, default: false},
    ipfsBeta: {type: Boolean, default: false}
});
const DonationSchema = new mongoose.Schema({
    username: {type: String},
    address: {type: String},
    ticker: {type: String}
})
const DonationAccountTypesSchema = new mongoose.Schema({
    ticker: {type: String},
    img: {type: String}
})
const LiveStreamKeySchema = new mongoose.Schema({
    username: {type: String, required: true},
    key: {type: String, required: true, unique: true},
    lastUpdate: {type: Date, required: true, default: Date.now()}
})
const ContentCreatorPaymentSchema = new mongoose.Schema({
    username: {type: String, required: true},
    timestamp: {type: Date, required: true, default: Date.now()},
    amount: {type: Number, required: true},
    forwarded: {type: Boolean, required: true, default: false},
    currency: {
        type: String,
        required: true,
        enum: ["STEEM", "SBD"],
        default: "STEEM"
    },
    type: {
        type: String,
        required: true,
        enum: [
            "signup",
            "monthly",
            "annually"
        ],
        default: "monthly"
    },
    status: {
        type: String,
        required: true,
        enum: [
            "pending",
            "completed",
            "refunded"
        ],
        default: "pending"
    },
    amount_refunded: {type: Number, required: true, default: 0},
    memo: {type: String, required: true, unique: true}
});
const VideoSchema = new mongoose.Schema({
    filename: {type: String, required: false},
    updateSteem: {type: Boolean, default: false},
    lowRc: {type: Boolean, default: false, required: true},
    originalFilename: {type: String, required: true},
    thumbnail: String,
    title: String,
    score_boost: Number,
    needsBlockchainUpdate: {type: Boolean, default: false, required: true},
    tags: String,
    description: String,
    status: {
        type: String,
        enum: ["uploaded", "encoding", "saving", "published", "deleted", "encoding_failed", "encoding_queued", "encoding_halted_time", "encoding_queued_vod", "scheduled", "encoding_ipfs", "encoding_preparing", "publish_manual", "self_deleted", "beneficiary_check_failed"],
        default: 'uploaded',
        required: true
    },
    encoding_price_steem: {type: String, required: true, default: "0.000"},
    paid: {type: Boolean, default: false, required: true}, //only ever true when there was a manual payment!
    encodingProgress: {type: Number, required: true, default: 0},
    raw_description: String,
    size: {type: Number, required: true},
    permlink: {type: String, required: true},
    duration: {type: Number, required: true},
    created: {type: Date, required: true, default: Date.now()},
    published: Date,
    pipeline: String,
    encoding: {
        "360": {type: Boolean, default: false, required: true},
        "480": {type: Boolean, default: false, required: true},
        "720": {type: Boolean, default: false, required: true},
        "1080": {type: Boolean, default: false, required: true}
    },
    owner: {type: String, required: true},
    is3CJContent: {type: Boolean, required: false, default: false},
    isVOD: {type: Boolean, required: false, default: false},
    isNsfwContent: {type: Boolean, default: false},
    declineRewards: {type: Boolean, default: false},
    rewardPowerup: {type: Boolean, default: false},
    language: {type: String, required: false, default: "en"},
    category: {type: String, required: false, default: "general"},
    firstUpload: {type: Boolean, default: false},
    community: {type: String, default: null},
    indexed: {type: Boolean, default: false},
    views: {type: Number, default: 0},
    hive: {type: String, default: 'hive-181335'},
    upvoteEligible: {type: Boolean, default: true},
    publish_type: {type: String, default: "publish", enum: ["publish", "schedule"], required: true},
    publish_data: {type: Date},
    beneficiaries: {type: String, default: '[]'},
    userId: String,
    votePercent: {type: Number, default: 1},
    reducedUpvote: {type: Boolean, default: false},
    donations: {type: Boolean, default: false},
    postToHiveBlog: {type: Boolean, default: false},
    tags_v2: [String],
    upload_type: {type: String},
    job_id: {type: String},
    video_v2: {type: String},
    local_filename: {type: String},
    fromMobile: {type: Boolean, default: false},
    isReel: {type: Boolean, default: false},
    app: {type: String},
    width: {type: Number, default: null, required: false},     
    height: {type: Number, default: null, required: false},
    isAudio: {type: Boolean, default: false},
    jsonMetaDataAppName: {type: String, default: null, required: false},
});
const SubscriptionSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    channel: {type: String, required: true},
    followed_since: {type: Date, required: true, default: Date.now()},
    notifications: {type: Boolean, required: true, default: true}
});
const BlogSchema = new mongoose.Schema({
    channel: {type: String, required: true},
    permlink: String,
    status: {
        type: String,
        enum: ["draft", "published", "deleted"],
        required: true,
        default: "draft"
    },
    title: {
        type: String
    },
    body: {
        type: String,
    },
    category: {
        type: String,
        enum: [
            "social",
            "announcement",
            "general",
            "gaming",
            "politics",
            "other"
        ],
        required: true,
        default: "general"
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now()
    },
    thumbnail: {
        type: String,
        required: false,
        default: null
    }
});
const ViewSchema = new mongoose.Schema({
    author: {type: String, required: true},
    permlink: {type: String, required: true},
    userIP: {type: String, required: true},
    userAgent: {type: String},
    timestamp: {type: Date, required: true, default: new Date()}
});
const BalanceSchema = new mongoose.Schema({
    userId: {type: String, required: true, unique: true},
    balance: {type: Number, required: true, default: 0},
    created: Date
});
const TransactionSchema = new mongoose.Schema({
    from: {type: String, required: true},
    to: {type: String, required: true},
    permlink: String,
    amount: {type: Number, required: true, default: 0},
    memo: String,
    timestamp: {
        type: Date, required: true, default: new Date
    },
    type: {
        type: String,
        enum: ["issue", "transfer", "credit", "payout"],
        required: true
    }
});
const LiveStreamSchema = new mongoose.Schema({
    channel: {type: String, required: true, unique: true},
    streamkey: {type: String, required: true, unique: true},
    title: {type: String, required: true},
    poster: {type: String, required: true, default: 'https://v--03-eu-west.3speakcontent.online/static/live.png'},
    offline: {type: String, required: true, default: 'https://v--03-eu-west.3speakcontent.online/static/offline.jpg'},
    tier: {
        type: Number,
        required: true,
        enum: [1, 2, 3],
        default: 1
    },
    is247: {type: Boolean, required: true, default: false}
});
const LanguageSchema = new mongoose.Schema({
    code: {type: String, required: true},
    language: {type: String, required: true}
});
const GuideLinesAcceptSchema = new mongoose.Schema({
    username: {type: String, required: true},
    timestamp: {type: Date, required: true, default: Date.now()}
});
const LiveViewSchema = new mongoose.Schema({
    channel: {type: String, required: true},
    userIP: {type: String, required: true},
    userAgent: {type: String},
    timestamp: {type: Date, required: true, default: new Date()}
});
const InboxVerificationSchema = new mongoose.Schema({
    spkUser: {type: String},
    username: {type: String},
    verifyId: {type: String},
    platform: {type: String},
    sent: {type: Boolean, required: true, default: false}
});

const UserSchema = {
    user_id: {type: String, required: true, unique: true},
    banned: {type: Boolean, required: true, default: false},
    self_deleted: {type: Boolean, required: false, default: false},
    email: {type: String, required: true, unique: true},
    last_identity: mongoose.ObjectId,
    display_name: String //fallback for non blockchain user
}

const MobileUserSchema = {
    user_id: {type: String, required: true, unique: true},
    network: {type: String, required: true, default: 'hive'},
    banned: {type: Boolean, required: true, default: false},
    self_deleted: {type: Boolean, required: false, default: false},
}

const MobileUserPushTokenSchema = {
    user_id: {type: String, required: true},
    token: {type: String, required: true},
    network: {type: String, required: true, default: 'hive'},
}

const MobileUserNotifySchema = {
    user_id: {type: String, required: true},
    video_id: {type: String, required: true},
    notified: {type: Boolean, required: true, default: false},
}

const HiveAccountSchema = {
    account: {type: String, required: true},
    user_id: {type: mongoose.ObjectId, required: true},
}

const HiveAccountChallengeSchema = {
    account: {type: String, required: true},
    user_id: {type: String, required: true},
    challenge: {type: String, required: true, unique: true},
    key: {type: String, required: true, default: "posting", enum: ["posting", "active"]}
}

const ChatBotTokenSchema = {
    account: {type: String, required: true, unique: true},
    token: {type: String, required: true}
}

const VideoBoostSchema = new mongoose.Schema({
    user_id: {type: String},
    permlink: String,
    order_id: {type: mongoose.ObjectId},
    boost: Number
});

const PodcastSchema = new mongoose.Schema({
    podcast_title: String,
    podcast_owner: String,
    podcast_description: String,
    podcast_image: String,
    podcast_categories: Array,
    podcast_languages: Array
});

const VideoBoost = mongoose.model("VideoBoost", VideoBoostSchema);
const ChatBotToken = mongoose.model("ChatBotToken", ChatBotTokenSchema);
const HiveAccountChallenge = mongoose.model("HiveAccountChallenge", HiveAccountChallengeSchema);
const HiveAccount = mongoose.model("HiveAccount", HiveAccountSchema);
const User = mongoose.model("User", UserSchema);
const MobileUser = mongoose.model("MobileUser", MobileUserSchema);
const MobileUserPushToken = mongoose.model("MobileUserPushToken", MobileUserPushTokenSchema);
const MobileUserNotify = mongoose.model("MobileUserNotify", MobileUserNotifySchema);
const LiveStreamKey = mongoose.model("LiveStreamKey", LiveStreamKeySchema);
const Balance = mongoose.model("Balance", BalanceSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);
const Community = mongoose.model("Community", CommunitySchema);
const HiveCommunity = mongoose.model("HiveCommunity", HiveCommunitySchema);
const CommunityMember = mongoose.model("CommunityMember", CommunityMemberSchema);
const ContentCategory = mongoose.model("ContentCategory", ContentCategorySchema);
const ContentCreator = mongoose.model("ContentCreator", ContentCreatorSchema);
const ContentCreatorPayment = mongoose.model("ContentCreatorPayment", ContentCreatorPaymentSchema);
const Video = mongoose.model("Video", VideoSchema);
const Blog = mongoose.model("Blog", BlogSchema);
const Subscription = mongoose.model("Subscription", SubscriptionSchema);
const View = mongoose.model('View', ViewSchema);
const Language = mongoose.model("Language", LanguageSchema);
const Livestream = mongoose.model("Livestream", LiveStreamSchema);
const GuideLinesAccept = mongoose.model("GuideLinesAccept", GuideLinesAcceptSchema);
const LiveView = mongoose.model('LiveView', LiveViewSchema);
const InboxVerification = mongoose.model('InboxVerification', InboxVerificationSchema);
const Donation = mongoose.model('Donation', DonationSchema);
const DonationAccountTypes = mongoose.model('DonationAccountTypes', DonationAccountTypesSchema)
const Podcast = mongoose.model('Podcast', PodcastSchema)

async function updateBalance(user) {
    const tx = await Transaction.aggregate([
        {
            $match: {
                $or: [{
                    to: user
                },
                    {from: user}
                ]
            }
        },
        {
            $sort: {
                timestamp: -1
            }
        }
    ]);

    let amount = 0;

    for (let i in tx) {
        switch (tx[i].type) {
            case 'issue':
                if (user !== "oauth2|Steemconnect|threespeak") {
                    amount += parseFloat(tx[i].amount)
                }
                break;
            case 'credit':
                amount += parseFloat(tx[i].amount)
                break;
            case 'payout':
                amount -= parseFloat(tx[i].amount)
                break;
            case 'transfer':
                if (tx[i].to === user) {
                    amount += parseFloat(tx[i].amount)
                } else {
                    amount -= parseFloat(tx[i].amount)
                }
                break;
        }
    }

    let balance = await Balance.findOne({userId: user});

    if (balance === null) {
        let balance = new Balance();
        balance.userId = user;
        balance.balance = amount;
        balance.created = new Date();
        await balance.save();
    } else {
        await Balance.updateOne({userId: user}, {balance: amount});
    }

    console.log("> Update Balance for", user, "to", amount);

    return amount;
}

async function getIdentities(user_id) {
    return HiveAccount.find({user_id})
}

async function isUsernameAvailable(username) {
    return true;
}

export default {
  GuideLinesAccept,
  Balance,
  Transaction,
  View,
  Community,
  HiveCommunity,
  CommunityMember,
  ContentCategory,
  ContentCreator,
  ContentCreatorPayment,
  Subscription,
  Livestream,
  Language,
  Video,
  LiveView,
  Blog,
  InboxVerification,
  User,
  MobileUser,
  MobileUserPushToken,
  MobileUserNotify,
  HiveAccount,
  HiveAccountChallenge,
  updateBalance,
  getIdentities,
  ChatBotToken,
  VideoBoost,
  Donation,
  DonationAccountTypes,
  Podcast,
};
