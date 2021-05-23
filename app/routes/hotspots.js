const express = require('express');
const url = require('url');
const { NotFoundError } = require('../utils/errors');
const contentBucket = require('../lib/buckets/content');
const { generatePresignedUrl } = require('../utils/s3');
const { contentBucket: contentBucketConfig } = require('../configs/aws');
const { mapMimeToView, separator } = require('../configs/mime');

const router = express.Router();

module.exports = function(store) {
  function retrieveRedirect(attendee, originalUrl) {
    const path = url.parse(originalUrl).pathname;
    const key = path.substring(path.lastIndexOf('/') + 1);

    return new Promise((resolve, reject) => {
      store.retrieveRedirect(attendee.client, attendee.event, key, (redirect) => {
        if(redirect && redirect.destination_url) {
          resolve(redirect)
        } else {
          reject(new NotFoundError('Hotspot not found.'))
        }
      });
    });
  }

  router.get('*', async (req, res, next) => {
    try {
      const redirect = await retrieveRedirect(req.user, req.originalUrl);
      let destination_url;

      if(redirect.presign) {
        destination_url = presignedUrlFromContentBucket(redirect.destination_url);
      } else {
        destination_url = redirect.destination_url;
      }

      res.locals = { destination_url, mime_type: redirect.mime_type };

      switch(redirect.type) {
        case 'new_page': 
          return res.render('hotspots_redirect');
        case 'display':
          const renderPage = mapMimeToView(redirect.mime_type)
          return res.type('html').render(renderPage);
        default:
          return res.redirect(destination_url);
      }
    } catch(err){
      next(err);
    }
  });

  return router;
}

function presignedUrlFromContentBucket(key) {
  const bucketName = contentBucketConfig.bucket;
  const duration = 15 * 60; // Signed url expires in 15 minutes
  return generatePresignedUrl(contentBucket, bucketName, key, duration);
}
