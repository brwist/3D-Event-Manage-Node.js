const { presignedUrlFromContentBucket } = require('../utils/s3');

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

function fetchEnvironmentalConfig(store, client, event, configKey) {
  return new Promise((resolve, reject) => {
    // get environmental configuration from Redis
    store.retrieveEnvironmentalConfiguration(client, event, configKey, (value) => {
      resolve(value);
    });
  });
}

async function fetchCustomFont(store) {
  return await presignedUrlFromContentBucket(await fetchSystemConfig(store, 'custom_font'));
}

async function fetchLoginLogo(store, client, event) {
  return await presignedUrlFromContentBucket(await fetchSystemConfig(store, 'login_logo'));
}

async function fetchLoginPrompt(store) {
  return (await fetchSystemConfig(store, 'login_prompt'));
}

async function fetchDefaultRedirect(store) {
  return (await fetchSystemConfig(store, 'default_redirect'));
}

async function fetchStylingColor(store) {
  return (await fetchSystemConfig(store, 'styling_color'));
}

module.exports = {
  fetchEventConfig,
  fetchCustomFont,
  fetchLoginLogo,
  fetchLoginPrompt,
  fetchStylingColor,
  fetchDefaultRedirect,
  fetchEnvironmentalConfig
}
