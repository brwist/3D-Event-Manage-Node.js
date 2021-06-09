const express = require('express');
const s3Proxy = require('s3-proxy');
const { downloadFromS3 } = require('../utils/s3');
const { fetchEventConfig, fetchEnvironmentalConfig } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');
const debug = require('debug')('redis-storage-adapter');
const experienceBucket = require('../lib/buckets/experience');
const { experienceBucket: experienceBucketConfig, contentBucket: contentBucketConfig } = require('../configs/aws');

const router = express.Router({mergeParams: true});
const hotspotRegex = /labels\.(.+)/g

module.exports = function(store) {
  router.get('/', async (req, res) => {
    const { client, event } = req.params;
    const experience = await fetchMainEntrance(store, client, event);
    debug('Loading main entrance %o', experience);
    res.redirect(`/${client}/${event}/${experience}/index.htm`);
  });

  router.get('/:experience/locale/en.txt', async (req, res) => {
    debug('Processing en.txt...');
    try {
      const experience = req.params.experience;
      const s3BucketName = experienceBucketConfig.bucket;
      const s3KeyName = `${experience}/locale/en.txt`;
      const s3Content = await downloadFromS3(experienceBucket, s3BucketName, s3KeyName);
      const text = s3Content.data.toString();
      const transformedText = await transformHotspotsToTooltip(text, req, store);
      res.format({
        text: function () {
          res.send(transformedText)
        }
      });
    } catch(error) {
      if(error.code === 'NoSuchKey') {
        error = NotFoundError(error.message);
      }
      throw(error);
    }
  });

  router.get('/:experience/:file', async (req, res, next) => {
    let bucket = contentBucketConfig.bucket;
    let awsConfig = contentBucketConfig.awsConfig;
    const { client, event, experience, file } = req.params;
    const environmentalConfig = await fetchEnvironmentalConfig(store, client, event, `${experience}/${file}`);

    if(environmentalConfig) {
      // s3Proxy determines S3 key based on originalUrl
      req.originalUrl = `/${client}/${event}/${environmentalConfig}`
    } else {
      // If environmentalConfig is not found then proxy content from experience bucket instead
      bucket = experienceBucketConfig.bucket;
      awsConfig = experienceBucketConfig.awsConfig;
    }

    s3Proxy({
      ...awsConfig,
       bucket,
       overrideCacheControl: 'max-age=100000',
       defaultKey: 'index.html'
     })(req, res, next);
  });

  router.get('*', (req, res, next) => {
    const bucket = experienceBucketConfig.bucket;
    const awsConfig = experienceBucketConfig.awsConfig;
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
