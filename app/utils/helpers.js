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

async function fetchDefaultRedirect(store) {
  return (await fetchSystemConfig(store, 'default_redirect'));
}

module.exports = {
  fetchEventConfig,
  fetchSystemConfig,
  fetchLoginBackground,
  fetchLoginLogo,
  fetchLoginPrompt,
  fetchDefaultRedirect
}
