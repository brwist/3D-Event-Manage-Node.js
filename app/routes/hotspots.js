const express = require('express');
const url = require('url');
const { NotFoundError } = require('../utils/errors');
const contentBucket = require('../lib/buckets/content');
const { generatePresignedUrl } = require('../utils/s3');
const { contentBucket: contentBucketConfig } = require('../configs/aws');

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
      if(redirect.presign) {
        const bucketName = contentBucketConfig.bucket;
        const key = redirect.destination_url;
        const duration = 15 * 60; // Signed url expires in 15 minutes
        const destination_url = generatePresignedUrl(contentBucket, bucketName, key, duration);
        res.locals = {
          destination_url: destination_url
        };
        return res.render('content_page');
      }
      if(redirect.type === 'new_page') {
        res.locals = {
          destination_url: redirect.destination_url
        }
        return res.render('hotspots_redirect');
      } else {
        return res.redirect(redirect.destination_url);
      }
    } catch(err){
      next(err);
    }
  });

  return router;
}
