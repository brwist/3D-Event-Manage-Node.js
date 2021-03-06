const debug = require('debug')('authentication');
const { redirectToLogin } = require('../utils/redirect');
const { fetchEventConfig, fetchLoginLogo, fetchLoginPrompt } = require('../utils/helpers');
const { presignedUrlFromContentBucket } = require('../utils/s3');

function isAuthenticated(req) {
  const {client, event} = req.params;

  return req.isAuthenticated() &&
    req.user.client == client &&
    req.user.event == event;
}

function logout(req, res) {
  const {client, event} = req.params;
  req.logout();
  res.redirect(`/${client}/${event}/login`);
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
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

module.exports = (store, passport) => {
    return {
      logout,
      ensureAuthenticated,
      redirectUnauthenticated,
      loginPage: async (req, res) => {
        if (isAuthenticated(req)) {
          debug('attendee is authenticated redirecting...');
          const {client, event} = req.params;
          res.redirect(`/${client}/${event}`);
        } else {
          res.locals.loginPath = req.originalUrl;
          res.locals.loginLogo = await fetchLoginLogo(store);
          res.locals.loginPrompt = await fetchLoginPrompt(store);

          res.render('login');
        }
      },
      login: async (req, res, next) => {
        const {client, event} = req.params;
        debug('attendee authenticating');

        try {
          passport.authenticate('local', (err, user) => {
            if (err || !user) {
              debug('error authenticating');
              redirectToLogin(req, res);
            } else {
              req.logIn(user, async (loginErr) => {
                debug('attendee logIn');
                if (loginErr) {
                  throw loginErr;
                }

                const now = new Date().getTime();
                const startTime = await fetchEventConfig(store, client, event, 'start_time');
                const endTime = await fetchEventConfig(store, client, event, 'end_time');
                res.locals.backgroundColor = await fetchEventConfig(store, client, event, 'landing_background_color');
                res.locals.foregroundColor = await fetchEventConfig(store, client, event, 'landing_foreground_color');
                // event has not started yet
                if (parseInt(startTime, 10) > now) {
                  const logoS3Key =  await fetchEventConfig(store, client, event, 'landing_logo');
                  res.locals.encodedJson =  encodeURIComponent(JSON.stringify({startTime}));
                  res.locals.logo = await presignedUrlFromContentBucket(logoS3Key);
                  res.locals.prompt = await fetchEventConfig(store, client, event, 'landing_prompt');
                  return res.render('event_waiting_page');
                } else if (parseInt(endTime, 10) < now) { // event has expired
                  return res.render('event_expired_page');
                }
                debug('redirecting to event root');
                return res.redirect(`/${client}/${event}`);
              });
            }
          })(req, res, next);
        } catch (err) {
          debug('error %O', err);
          next(err);
        }
      }
    }
}

