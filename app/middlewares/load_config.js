const debug = require('debug')('load_config');
const { fetchStylingColor, fetchCustomFont } = require('../utils/helpers');

module.exports = {
  initialize: (store) => {
    debug('initializing load config');
    return (async (req, res, next) => {
      debug('loading config...');
      const stylingColor = await fetchStylingColor(store);
      const customFont = await fetchCustomFont(store);

      res.locals.stylingColor = stylingColor;
      res.locals.customFont = customFont;

      return next();
    });
  }
}
