const { redirectToLogin } = require('../utils/redirect')
const { fetchEventConfig, fetchLoginBackground, fetchLoginLogo, fetchLoginPrompt, fetchStylingColor } = require('../utils/helpers');

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
        const loginPath = req.originalUrl;
        const loginBackground = await fetchLoginBackground(store);
        const loginLogo = await fetchLoginLogo(store);
        const loginPrompt = await fetchLoginPrompt(store);
        const stylingColor = await fetchStylingColor(store);

        if (isAuthenticated(req)) {
          const {client, event} = req.params;
          res.redirect(`/${client}/${event}`);
        } else {
          res.locals = {
            loginPath,
            loginBackground,
            loginLogo,
            loginPrompt,
            stylingColor
          };
          res.render('login');
        }
      },
      login: async (req, res, next) => {
        const {client, event} = req.params;

        try {
          passport.authenticate('local', (err, user) => {
            if (err || !user) {
              redirectToLogin(req, res);
            } else {
              req.logIn(user, async (loginErr) => {
                if (loginErr) {
                  throw loginErr;
                }

                const now = new Date().getTime();
                const startTime = await fetchEventConfig(store, client, event, 'start_time');
                const endTime = await fetchEventConfig(store, client, event, 'end_time');

                // event has not started yet
                if (parseInt(startTime, 10) > now) {
                  return res.render('event_waiting_page', {
                    encodedJson: encodeURIComponent(JSON.stringify({startTime})),
                  });
                } else if (parseInt(endTime, 10) < now) { // event has expired
                  return res.render('event_expired_page');
                }
                return res.redirect(`/${client}/${event}`);
              });
            }
          })(req, res, next);
        } catch (err) {
          next(err);
        }
      }
    }
}

