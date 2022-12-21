import mongo from '../mongoDB.js';

async function calculateUploadedTime(creator, month, year) {
    const freeSeconds = 2 * 60 * 60; //2 hours
    function pad(num, size) {
        var s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }

    if (!month || !year || year.toString().length < 4) {
        let now = new Date();
        if (!month) {
            month = now.getMonth() + 1
        }
        if (!year || year.toString().length < 4) {
            year = now.getFullYear();
        }
    }


    let creatorDB = await mongo.ContentCreator.findOne({username: creator});

    if (!creatorDB.lastPayment) {
        return {
            freeSeconds,
            uploadedTotal: 0,
            freeUploadLeft: 0,
            creator,
            percentage: {
                label: '100.00',
                width: 100,
                color: "danger"
            }
        }
    }

    let payment = await mongo.ContentCreatorPayment.findOne({_id: creatorDB.lastPayment});

    /*if (payment === null) {
        let payment = new mongo.ContentCreatorPayment();
        payment.timestamp = new Date();
        payment.
    }*/

    let firstDay = new Date(payment.timestamp)

    let lastDay = new Date(payment.timestamp)
    lastDay.setMonth(lastDay.getMonth() + 1);


    let query = {
        owner: creator,
        created: {
            $gte: firstDay,
            $lt: lastDay
        },
        status: {$nin: [ 'uploaded','encoding_halted_time']}
    };


    let duration = 0;

    let results = await mongo.Video.find(query);

    for (let i in results) {
        duration += results[i].duration;
    }

    let width = duration / freeSeconds * 100;
    if (width > 100) {
        width = 100
    }

    width = width.toFixed(2)

    return {
        videos: results,
        freeSeconds,
        uploadedTotal: duration,
        freeUploadLeft: freeSeconds - duration <= 0 ? 0 : freeSeconds - duration,
        creator,
        percentage: {
            label: (100 - ((freeSeconds - duration > 0 ? freeSeconds - duration : 0) / freeSeconds * 100)).toFixed(2),
            width,
            color: width >= 75 ? 'danger' : width >= 65 ? 'warning' : "info"
        }
    }
}


export default calculateUploadedTime;