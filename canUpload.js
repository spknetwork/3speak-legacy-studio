const mongo = require("./mongoDB");
mongo.ContentCreator.updateMany({}, {hidden: false}).then(x => console.log(x));