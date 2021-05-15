const express = require('express');
const url = require('url');

const router = express.Router();

module.exports = function(store) {
  function retrieveRedirect(res, attendee, originalUrl) {
    const path = url.parse(originalUrl).pathname;
    const key = path.substring(path.lastIndexOf('/') + 1);

    store.retrieveRedirect(attendee.client, attendee.event, key, (redirect) => {
      if(redirect && redirect.destination_url) {
        res.redirect(redirect.destination_url);
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
