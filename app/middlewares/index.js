
function verifyAuthentication(req, res, next) {
  if (!req.isAuthenticated()) {
    res.status(401).end();
  } else {
    next();
  }
}

function clientEventAuthentication(req, res, next) {
  if (!req.isAuthenticated()) {
    const { client, event } = req.params
    res.status(302).redirect(`/${client}/${event}/login`);
  } else {
    next();
  }
}
module.exports = {
  verifyAuthentication,
  clientEventAuthentication
}
