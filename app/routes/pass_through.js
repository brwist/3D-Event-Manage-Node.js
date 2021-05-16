const express = require('express');
const s3Proxy = require('s3-proxy');
const AWS = require('aws-sdk');
const { downloadFromS3 } = require('../utils/s3');
const { awsConfig, bucket } = require('../configs/aws');

AWS.config.update({...awsConfig});

const router = express.Router({mergeParams: true});
const hotspotRegex = /hotspots\.(\d+)/g

module.exports = function(store) {
  router.get('/', async (req, res) => {
    const { client, event } = req.params;
    const room = await fetchDefaultRoom(store, client, event);
    res.redirect(`/${client}/${event}/${room}/index.htm`);
  });

  router.get('/locale/en.txt', async (req, res) => {
    try {
      const s3Content = await downloadFromS3('locale/en.txt');
      const text = s3Content.data.toString();
      const transformedText = await transformHotspotsToTooltip(text, req, store);
      res.format({
        text: function () {
          res.send(transformedText)
        }
      });
    } catch(error) {
      res.sendStatus(500);
    }
  });

  router.get('*', (req, res, next) => {
    s3Proxy({
     ...awsConfig,
      bucket,
      overrideCacheControl: 'max-age=100000',
      defaultKey: 'index.html'
    })(req, res, next);
  });

  return router;
}

async function transformHotspotsToTooltip(text, req, store) {
  const matchedTexts = text.match(hotspotRegex);
  if(!matchedTexts) { return text }

  const ids = matchedTexts.map(matchText => matchText.split('.')[1]);
  const toolTips = await fetchToolTips(store, req, ids);
  return text.replace(hotspotRegex, (substring, matchNumber) => {
    return toolTips[matchNumber] ? toolTips[matchNumber] : substring;
  });
}

async function fetchToolTips(store, req, ids) {
  let tooltip = {};
  const { client, event } = req.params; 
  const fetchTooltip = ids.map(id => {
    return new Promise((resolve, reject)=> {
      // get tooltip value from Redis
      store.retrieveRedirect(client, event, id, (response) => {
        resolve(response);
      });
    }).then((redirect) => {
      // cache tooltip
      if(redirect && redirect.tooltip) {
        tooltip[id] = redirect.tooltip;
      }
    })
  });
  await Promise.all(fetchTooltip);
  return tooltip;
}

function fetchDefaultRoom(store, client, event) {
  const configKey = 'default_room'
  return new Promise((resolve, reject) => {
    // get event configuration from Redis
    store.retrieveEventConfiguration(client, event, configKey, (defaultRoom) => {
      resolve(defaultRoom);
    });
  });
}
