const username = "clixmoney";
const helper = require("./payment_helper/calculateUploadedTime");


helper(username).then(result => {
    let videos = [];
    for (let i in result.videos) {
        videos.push({
            title: result.videos[i].title,
            permlink: result.videos[i].permlink,
            created:result.videos[i].created,
            status: result.videos[i].status
        })
    }

    delete result.videos
    console.table(videos)
    console.table(result)
})