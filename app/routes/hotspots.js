const express = require('express');
const url = require('url');
const { NotFoundError } = require('../utils/errors');
const { presignedUrlFromContentBucket } = require('../utils/s3');
const { mapMimeToView } = require('../configs/mime');
const { fetchEnvironmentalConfig } = require('../utils/helpers');

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
        destination_url = await presignedUrlFromContentBucket(redirect.destination_url);
      } else {
        destination_url = redirect.destination_url;
      }

      res.locals = {
        destination_url,
        mime_type: redirect.mime_type,
        allow_download: redirect.allow_download,
      };

      switch(redirect.type) {
        case 'new_page':
          const {client, event} = req.params;
          res.locals.backgroundColor = await fetchEventConfig(store, client, event, 'landing_background_color');
          res.locals.foregroundColor = await fetchEventConfig(store, client, event, 'landing_foreground_color');
          return res.render('hotspots_redirect');
        case 'display':
          const renderPage = mapMimeToView(redirect.mime_type)
          return res.type('html').render(renderPage);
        case 'navigation':
          return res.redirect(`/${req.user.client}/${req.user.event}/${destination_url}/index.htm`);
        default:
          return res.redirect(destination_url);
      }
    } catch(err){
      next(err);
    }
  });

  return router;
}

