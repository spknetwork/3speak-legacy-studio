import mongo from './mongoDB.js';
import ordinal from 'ordinal';

Date.prototype.monthDays = function (month) {
    var d = new Date(this.getFullYear(), month, 0);
    return d.getDate();
}

function getAggregation(month, year,  user) {
    return [
        {
            '$project': {
                'doc': '$$ROOT',
                'year': {
                    '$year': '$timestamp'
                },
                'month': {
                    '$month': '$timestamp'
                },
                'day': {
                    '$dayOfMonth': '$timestamp'
                }
            }
        }, {
            '$match': {
                'month': month,
                // 'year': year,
                'doc.author': user
            }
        }, {
            '$group': {
                '_id': {
                    '$dayOfMonth': '$doc.timestamp'
                },
                'count': {
                    '$sum': 1
                }
            }
        },
        {
            $sort: {
                _id: 1
            }
        }
    ]
}

function getLastMonth(month) {
    if (parseInt(month) - 1 < 1) {
        return 12 + (parseInt(month) - 1) //allow for january to return last month equals december. overflow. yeaaah
    }
    return parseInt(month) - 1
}

function getMonthName(month) {
    const m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return m[parseInt(month) - 1]
}



async function generate(user, month, year, ) {

    let today = new Date();

    if (month === undefined) {
        month = today.getUTCMonth() + 1
    }

    if (year === undefined) {
        year = today.getUTCFullYear()
    }


    // if (fs.existsSync("./statistics/" + user) === false) {
    //     fs.mkdirSync("./statistics/" + user)
    // }

    const days = [];
    const daysInMonth = (new Date()).monthDays(month);
    const daysInLastMonth = (new Date()).monthDays(getLastMonth(month));

    for (let i = 1; i <= (daysInMonth > daysInLastMonth ? daysInMonth : daysInLastMonth); i++) {
        days.push(ordinal(i))
    }

    const data = await mongo.View.aggregate(getAggregation(month,year,  user));

    let lastYear = year;

    if (getLastMonth(month) > month) {
        lastYear -= 1;
    }

    const dataLast = await mongo.View.aggregate(getAggregation(getLastMonth(month), lastYear, user));
    const chartData = [];
    const chartDataLast = [];

    for (let i in data) {
        chartData.push(data[i].count)
    }
    for (let i in dataLast) {
        chartDataLast.push(dataLast[i].count)
    }

    const config = {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: getMonthName(getLastMonth(month)),
                data: chartDataLast,
                borderColor: 'rgb(255, 159, 64)',
                fill: true
            }, {
                label: getMonthName(month),
                data: chartData,
                fill: true
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '3Speak Video Views - Channel: ' + user
            },
            tooltips: {
                mode: 'index',
                intersect: false,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Days'
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Views'
                    }
                }]
            }
        }
    }


    return {
        config
    }


    // return new Promise((resolve, reject) => {
    //     twig.renderFile('./statistics/template.twig', {month, config}, (err, html) => {
    //         require("fs").writeFileSync("./statistics/" + user + "/views_" + month + "_" + year + ".html", html);
    //         resolve(html)
    //
    //     })
    // })
}


export default {
    generate,
    getMonthName,
    getLastMonth
};

// (async () => {
//
//     let creator = await mongo.ContentCreator.aggregate([
//         {
//             '$match': {
//                 'banned': false,
//                 score: {$gte: 15}
//             }
//         }, {
//             '$group': {
//                 '_id': '$username',
//                 'score': {
//                     '$push': '$score'
//                 }
//             }
//         }, {
//             '$sort': {
//                 'score': -1
//             }
//         }
//     ]);
//
//     for (let i in creator) {
//         for (let m in months) {
//             await generate(months[m],2019, creator[i]._id)
//             console.log(creator[i]._id, months[m])
//         }
//     }
//
//     console.log("DONE")
//
//    // let d =  await generate(12,2019, "wehmoen")
//    //  console.log(d)
//
// })();

