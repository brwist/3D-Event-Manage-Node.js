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

async function fetchLoginBackground(store, client, event) {
  return (await fetchSystemConfig(store, 'login_background'));
}

async function fetchLoginLogo(store, client, event) {
  return (await fetchSystemConfig(store, 'login_logo'));
}

async function fetchLoginPrompt(store) {
  return (await fetchSystemConfig(store, 'login_prompt'));
}

async function fetchDefaultRedirect(store) {
  return (await fetchSystemConfig(store, 'default_redirect'));
}

module.exports = {
  fetchEventConfig,
  fetchLoginBackground,
  fetchLoginLogo,
  fetchLoginPrompt,
  fetchDefaultRedirect
}
