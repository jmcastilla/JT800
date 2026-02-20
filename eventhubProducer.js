require("dotenv").config();
const { EventHubProducerClient } = require("@azure/event-hubs");

const EVENTHUB_CONNECTION_STRING = process.env.EVENTHUB_CONNECTION_STRING;
const EVENTHUB_NAME = process.env.EVENTHUB_NAME;

if (!EVENTHUB_CONNECTION_STRING) throw new Error("Falta EVENTHUB_CONNECTION_STRING");
if (!EVENTHUB_NAME) throw new Error("Falta EVENTHUB_NAME");

let producer;

function getProducer() {
  if (!producer) producer = new EventHubProducerClient(EVENTHUB_CONNECTION_STRING, EVENTHUB_NAME);
  return producer;
}

async function sendEvent(body) {
  const p = getProducer();
  const batch = await p.createBatch();
  if (!batch.tryAdd({ body })) throw new Error("Evento demasiado grande para Event Hub");
  await p.sendBatch(batch);
}

async function closeProducer() {
  if (producer) await producer.close();
  producer = null;
}

module.exports = { sendEvent, closeProducer };
