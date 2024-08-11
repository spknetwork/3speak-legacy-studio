import '../page_conf.js'
import mongoDB from '../mongoDB.js';
import Axios from 'axios'
//import mobileNotifier from '../mobile-firebase-notifier.js';

void (async () => {
    // setTimeout(() => {
    //     process.exit(0)
    // }, 300 * 1000)
    
    const videos = await mongoDB.Video.find({
        status: 'encoding_ipfs'
    }).sort('-created').limit(250);
    // console.log(videos)
    for(let video of videos) {
        const {data:jobInfo} = await Axios.get(`${global.APP_ENCODER_ENDPOINT}/api/v0/gateway/jobstatus/${video.job_id}`)
        const {job} = jobInfo;
        if(!job) {
            continue;
        }
        if(!job.result) {
            continue;
        }
        if(!job.result?.cid) {
            continue;
        }
        if(job.status === "complete") {
            const completed_by = job.assigned_to;
            try {
                const {data} = await Axios.get(`${global.APP_ENCODER_ENDPOINT}/api/v0/gateway/nodeinfo/${completed_by}`)
                const {node_info} = data;
                console.log(data)
                let beneficiaries = JSON.parse(video.beneficiaries) // it has to be `let` to be modifiable
                if(node_info.cryptoAccounts) {
                    if(node_info.cryptoAccounts.hive) {
                        if(!beneficiaries.find(e => {
                            return e.src === "ENCODER_PAY"
                        })) {
                            if (node_info.cryptoAccounts.hive == 'sagarkothari88' && video.fromMobile) {
                                beneficiaries.push({
                                    account: node_info.cryptoAccounts.hive,
                                    weight: 100,
                                    src: 'ENCODER_PAY_AND_MOBILE_APP_PAY'
                                })
                            } else if (video.fromMobile) {
                                beneficiaries.push({
                                    account: node_info.cryptoAccounts.hive,
                                    weight: 100,
                                    src: 'ENCODER_PAY'
                                })
                                beneficiaries.push({
                                    account: 'sagarkothari88',
                                    weight: 100,
                                    src: 'MOBILE_APP_PAY'
                                })
                            } else {
                                beneficiaries.push({
                                    account: node_info.cryptoAccounts.hive,
                                    weight: 100,
                                    src: 'ENCODER_PAY'
                                })
                            }
                        }
                    }
                }
                // console.log(video.beneficiaries)
                video.beneficiaries = JSON.stringify(beneficiaries);
            } catch (ex) {
                console.log(ex)
            }
            video.status = video.publish_type === 'publish' ? 'published' : 'scheduled'
            if (('fromMobile' in video && video.fromMobile === true) || ('app' in video && video.app !== undefined && video.app !== null)) {
                video.status = "publish_manual";
            }
            video.created = new Date(job.created_at)
            video.video_v2 = `ipfs://${job.result.cid}/manifest.m3u8`;
            video.needsHiveUpdate = true
            // console.log(video)
            await video.save()
        }
    }
    process.exit(0)
})();
