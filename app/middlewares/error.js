const debug = require('debug')('router-error');
const { fetchEventConfig } = require('../utils/helpers')
module.exports = {
  handle: (store) => {
    return (async (error, req, res, next) => {
      debug('Error accessing %s -- %O', req.originalUrl, error);
      if(error.status != 404) {
        // let default handler take care of unknown error
        throw error;
      }
      const { client, event } = req.params;
      res.locals.backgroundColor = await fetchEventConfig(store, client, event, 'landing_background_color');
      return res.type('.html').status(404).render('404');
    });
  }
}
