const { redirectToLogin } = require('../utils/redirect')

function isAuthenticated(req) {
 return req.isAuthenticated();
}

function ensureAuthenticated(req, res, next) {
  if (isAuthenticated(req)) {
    next();
  } else {
    res.status(401).end();
  }
}

function redirectUnauthenticated(req, res, next) {
  if (isAuthenticated(req)) {
    next();
  } else {
    redirectToLogin(req,res);
  }
}

function usernameToLowerCase(req, res, next){
  req.body.username = req.body.username.toLowerCase();
  next();
}

module.exports = {
  isAuthenticated,
  ensureAuthenticated,
  redirectUnauthenticated,
  usernameToLowerCase
}
