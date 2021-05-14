const express = require('express');
const url = require('url');

const router = express.Router();

module.exports = function(store) {
  function retrieveRedirect(res, attendee, originalUrl) {
    const key = url.parse(originalUrl).pathname;
    store.retrieveRedirect(attendee.client, attendee.event, key, (redirect) => {
      if(redirect && redirect.url) {
        res.redirect(redirect.url);
      } else {
        res.status(404).end();
      }
    });
  }

  router.get('*', (req, res) => {
    retrieveRedirect(res, req.user, req.originalUrl);
  });

  return router;
}
