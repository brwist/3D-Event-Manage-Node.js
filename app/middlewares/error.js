const debug = require('debug')('router-error');

const handleErrors = (error, req, res, next) => {
  debug('Encountered error: %O', error);

  if(error.status != 404) {
    // let default handler take care of unknown error
    throw error;
  }
  return res.status(404).render('404');
}

module.exports = handleErrors;
