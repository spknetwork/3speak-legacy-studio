let rabbit = undefined;
let channel = undefined;

async function getConnection() {
  if (channel !== undefined) {
    return channel;
  }
  if (rabbit === undefined) {
    rabbit = await require('amqplib').connect(APP_REDDITMQ_HOST);
  }

  if (channel === undefined) {
    channel = await rabbit.createChannel();
    channel.prefetch(1);
  }

  return channel;
}

async function consume(queue) {
  const channel = await getConnection();
  return channel.get(queue, {noAck: true});
}

async function ack(message) {
  const channel = await getConnection();
  return channel.ack(message)
}

async function store(queue, message) {
  const channel = await getConnection();
  return channel.sendToQueue(queue, Buffer.from(typeof message !== 'string' ? JSON.stringify(message) : message))
}

export default {
  consume,
  store,
  ack
};


process.on("exit", (code) => {
  if (channel !== undefined) {

    channel.close();
    console.log("Closing rabbit channel!")
  }
})
