const express = require('express');
const url = require('url');

const router = express.Router();

module.exports = function(store) {
  function retrieveRedirect(res, attendee) {
    store.retrieveEventConfiguration(attendee.event, (config) => {
      if(config) {
        res.redirect(config.Url);
      } else {
        res.status(404).end();
      }
    });
  }

  router.get('*', (req, res) => {
    retrieveRedirect(res, req.user);
  });

  return router;
}
