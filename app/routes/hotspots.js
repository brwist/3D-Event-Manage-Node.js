const express = require('express');
const url = require('url');
const { NotFoundError } = require('../utils/errors');

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
      if(redirect.type === 'new_page') {
        res.locals = {
          destination_url: redirect.destination_url
        }
        res.render('hotspots_redirect')
      } else {
        res.redirect(redirect.destination_url);
      }
    } catch(err){
      next(err);
    }
  });

  return router;
}
