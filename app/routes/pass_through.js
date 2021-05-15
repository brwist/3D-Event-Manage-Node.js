const express = require('express');
const s3Proxy = require('s3-proxy');
const AWS = require('aws-sdk');

const bucket = process.env.EXPERIENCE_BUCKET || 'experiences'
const awsConfig = {
  accessKeyId: process.env.EXPERIENCE_ACCESS_KEY_ID,
  secretAccessKey: process.env.EXPERIENCE_SECRET_ACCESS_KEY,
};

AWS.config.update({...awsConfig});

const router = express.Router({mergeParams: true});
const hotspotRegex = /hotspots\.(\d+)/g

module.exports = function(store) {
  router.get('/locale/en.txt', async (req, res) => {
    const s3Client = new AWS.S3();
    const config = {
      Bucket: bucket,
      Key: 'locale/en.txt'
    };
    s3Client.getObject(config).promise().then(async (data) => {
      const { client, event } = req.params;
      let text = data.Body.toString();
      let tooltip = {}
      const matchedTexts = text.match(hotspotRegex)
      if(!matchedTexts) { return text }
      const fetchTooltip = matchedTexts.map(matchText => {
        // matchText value has format hotspots.<value>
        // extract number from matchText
        const number = matchText.split('.')[1];
        return new Promise((resolve, reject)=> {
          // get tooltip value from Redis
          store.retrieveRedirect(client, event, number, (response) => {
            resolve(response)
          });
        }).then((redirect) => {
          // cache tooltip
          tooltip[number]=redirect.tooltip
        })
      });
      await Promise.all(fetchTooltip)
      // replace all hotspots.<value> with tooltip
      return text.replace(hotspotRegex, (substring, matchNumber) => tooltip[matchNumber]);
    }).then((text) => {
      res.format({
        text: function () {
          res.send(text)
        }
      });
    }).catch(err => {
      res.send(500);
    });
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
