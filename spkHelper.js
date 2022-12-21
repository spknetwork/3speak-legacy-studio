function getTotalPrice(amount) {

    function getTokenPrice(amount) {
        if (amount <= 500) {
            return 0.016
        }

        if (amount <= 1000) {
            return 0.015
        }

        return 0.014
    }

    function calculateFee(total) {
        return total * 0.029 + 0.25
    }

    const price = getTokenPrice(amount);
    const finalPrice = price * amount;
    const fees = calculateFee(finalPrice);

    return {
        quantity: amount,
        total: {
            display: (finalPrice+fees).toFixed(2),
            stripe: parseInt(parseFloat((finalPrice+fees).toFixed(2))*100)
        }
    };

}

export default { getTotalPrice };