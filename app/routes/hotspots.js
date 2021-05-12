const express = require('express');
const url = require('url');

const router = express.Router();

module.exports = function(store) {
  function retrieveRedirect(res, attendee, originalUrl) {
    const key = url.parse(originalUrl).pathname;
    store.retrieveRedirect(attendee.client, attendee.event, key, (url) => {
      if(url) {
        res.redirect(url);
      } else {
        res.status(404).end();
      }
    });
  }

  router.get('*', (req, res) => {
    if(req.isAuthenticated()) {
      retrieveRedirect(res, req.user, req.originalUrl);
    } else {
      res.status(401).end();
    }
  });

  return router;
}
