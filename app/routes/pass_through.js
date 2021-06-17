const express = require('express');
const s3Proxy = require('s3-proxy');
const { downloadFromS3 } = require('../utils/s3');
const { fetchEventConfig, fetchEnvironmentalConfig, fetchCurrentRoomAttendees } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');
const debug = require('debug')('redis-storage-adapter');
const experienceBucket = require('../lib/buckets/experience');
const roomAttendeeTracker = require('../middlewares/room_attendee_tracker');
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

  router.get('/:experience/locale/en.txt', roomAttendeeTracker.track(store), async (req, res) => {
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

  router.get('/:experience/media/:file', roomAttendeeTracker.track(store), async (req, res, next) => {
    debug('Loading media..');
    let bucket = experienceBucketConfig.bucket;
    let awsConfig = experienceBucketConfig.awsConfig;
    const { client, event, experience, file } = req.params;
    const environmentalConfig = await fetchEnvironmentalConfig(store, client, event, `${experience}/${file}`);

    if(environmentalConfig) {
      debug(`Environmental Config found ${environmentalConfig}`);
      // s3Proxy determines S3 key based on originalUrl
      bucket = contentBucketConfig.bucket;
      awsConfig = contentBucketConfig.awsConfig;
      req.originalUrl = `/${client}/${event}/${environmentalConfig}`;
    }

    s3Proxy({
      ...awsConfig,
       bucket,
       overrideCacheControl: 'max-age=100000',
       defaultKey: 'index.htm'
     })(req, res, next);
  });

  router.get('/:experience/attendees', roomAttendeeTracker.track(store), async (req, res) => {
    const { client, event, experience } = req.params;
    const attendees = await fetchCurrentRoomAttendees(store, client, event, experience);
    res.locals = { attendees };
    res.render('attendees');
  });

  router.get('*', (req, res, next) => {
    const bucket = experienceBucketConfig.bucket;
    const awsConfig = experienceBucketConfig.awsConfig;
    s3Proxy({
     ...awsConfig,
      bucket,
      overrideCacheControl: 'max-age=100000',
      defaultKey: 'index.htm'
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
