import hive from "@hiveio/hive-js";
import config from "../../consts.js";

hive.api.setOptions({
  useAppbaseApi: true,
  url: `https://api.hive.blog`,
});

async function main() {
    const [account] = await hive.api.getAccountsAsync(['sagar.tipbot']);
    const postingAuths = account.posting.account_auths
    const threespeakAuth = postingAuths.filter(a => a[0] === 'threespeak');
    if (threespeakAuth.length > 0) {
        console.log('posting authority given ✅');
    } else {
        console.log('posting authority ❌ NOT ❌ given');
    }
}

main();