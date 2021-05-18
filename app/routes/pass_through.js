const express = require('express');
const s3Proxy = require('s3-proxy');
const AWS = require('aws-sdk');
const { downloadFromS3 } = require('../utils/s3');
const { awsConfig, bucket } = require('../configs/aws');
const { fetchEventConfig } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');
const debug = require('debug')('redis-storage-adapter');

AWS.config.update({...awsConfig});

const router = express.Router({mergeParams: true});
const hotspotRegex = /hotspots\.(\d+)/g

module.exports = function(store) {
  router.get('/', async (req, res) => {
    const { client, event } = req.params;
    const experience = await fetchMainEntrance(store, client, event);
    res.redirect(`/${client}/${event}/${experience}/index.htm`);
  });

  router.get('/:experience/locale/en.txt', async (req, res) => {
    debug('Processing en.txt...');
    try {
      const experience = req.params.experience;
      const s3Content = await downloadFromS3(`${experience}/locale/en.txt`);
      const text = s3Content.data.toString();
      const transformedText = await transformHotspotsToTooltip(text, req, store);
      res.format({
        text: function () {
          res.send(transformedText)
        }
      });
    } catch(error) {
      if(err.code === 'NoSuchKey') {
        err = NotFoundError('Could not retrieve the file you were looking for.');
      }
      throw(err);
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
  debug('Matched Texts %o', matchedTexts);

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
      store.retrieveLabel(client, event, id, (response) => {
        resolve(response);
      });
    }).then((label) => {
      // cache tooltip
      if(label && label.text) {
        tooltip[id] = label.text;
      }
    })
  });
  await Promise.all(fetchTooltip);
  return tooltip;
}

async function fetchMainEntrance(store, client, event) {
  const configKey = 'main_entrance'
  const mainEntrance = await fetchEventConfig(store, client, event, configKey);
  return mainEntrance;
}
