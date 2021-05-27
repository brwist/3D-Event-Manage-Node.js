const {redirectToLogin} = require('../utils/redirect')

function authenticate(req, res, next) {
  if (!req.isAuthenticated()) {
    res.status(401).end();
  } else {
    next();
  }
}

function authenticateClientEvent(req, res, next) {
  if (!req.isAuthenticated()) {
    redirectToLogin(req,res);
  } else {
    next();
  }
}

function usernameToLowerCase(req, res, next){
  req.body.username = req.body.username.toLowerCase();
  next();
}

module.exports = {
  authenticate,
  authenticateClientEvent,
  usernameToLowerCase
}
