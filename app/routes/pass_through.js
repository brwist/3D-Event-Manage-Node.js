const express = require('express');
const s3Proxy = require('s3-proxy');

const router = express.Router();

const bucket = process.env.EXPERIENCE_BUCKET || 'experiences';
const accessKeyId = process.env.EXPERIENCE_ACCESS_KEY_ID;
const secretAccessKey = process.env.EXPERIENCE_SECRET_ACCESS_KEY;

module.exports = function() {
  router.get('*', (req, res, next) => {
    s3Proxy({
      bucket: bucket,
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      overrideCacheControl: 'max-age=100000',
      defaultKey: 'index.html'
    })(req, res, next);
  });

  return router;
}
