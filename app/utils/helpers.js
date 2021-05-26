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

function fetchSystemConfig(store, systemKey) {
  return new Promise((resolve, reject) => {
    // get system configuration from Redis
    store.retrieveSystemConfiguration(systemKey, (value) => {
      resolve(value);
    });
  });
}

// fetchSystemConfigOrFallback method tries to fetch given event config
// if not found then  will return system config
async function fetchSystemConfigOrFallback(store, client, event, configKey) {
  const eventSpecificValue = await fetchEventConfig(store, client, event, configKey);
  const systemValue = await fetchSystemConfig(store, configKey);
  return eventSpecificValue || systemValue;
}

async function fetchLoginBackground(store, client, event) {
  return (await fetchSystemConfigOrFallback(store, client, event, 'login_background'));
}

async function fetchLoginLogo(store, client, event) {
  return (await fetchSystemConfigOrFallback(store, client, event, 'login_logo'));
}

async function fetchLoginPrompt(store, client, event) {
  return (await fetchSystemConfigOrFallback(store, client, event, 'login_prompt'));
}

module.exports = {
  isEventLive,
  fetchEventConfig,
  fetchSystemConfig,
  fetchLoginBackground,
  fetchLoginLogo,
  fetchLoginPrompt
}
