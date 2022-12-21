import fetch from 'node-fetch';
import price from 'crypto-price';


async function calculateCostByLength(length) {
    console.log(length);
    length = length / 60;



    const price_per_minute = 0.032 * 5; //USD CENTS PER MINUTE. 3.2 cents per output quality per minute.

    // let steemPrice = await price.getCryptoPrice("USD", "STEEM");

    let steemPrice = "1";

    return (length * price_per_minute * 1.1 / parseFloat(steemPrice.price)).toFixed(2)

}

export default calculateCostByLength;