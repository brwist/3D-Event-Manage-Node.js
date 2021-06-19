const debug = require('debug')('router-error');
const { fetchStylingColor } = require('../utils/helpers')
module.exports = {
  handle: (store) => {
    return (async (error, req, res, next) => {
      debug('Error accessing %s -- %O', req.originalUrl, error);
      if(error.status != 404) {
        // let default handler take care of unknown error
        await Promise.resolve(function() { throw error; });
      }
      res.locals.backgroundColor = await fetchStylingColor(store);
      return res.type('.html').status(404).render('404');
    });
  }
}
