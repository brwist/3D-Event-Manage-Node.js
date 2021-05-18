const eventStartConfigKey = 'start_time';
const eventEndConfigKey = 'end_time';

async function isEventLive(store, client, event) {
  const startTime = await fetchEventConfig(store, client, event, eventStartConfigKey);
  const endTime = await fetchEventConfig(store, client, event, eventEndConfigKey);
  const now = new Date().getTime();
  return now >= parseInt(startTime) && now <= parseInt(endTime) ? true : false;
}

function fetchEventConfig(store, client, event, configKey) {
  return new Promise((resolve, reject) => {
    // get event configuration from Redis
    store.retrieveEventConfiguration(client, event, configKey, (value) => {
      resolve(value);
    });
  });
}

module.exports = {
  isEventLive,
  fetchEventConfig
}
