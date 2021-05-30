const redis = require('redis');
const http = require('http');
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config();

const logout = require('./app/routes/logout');
const Attendee = require('./app/models/attendee');
const hotspots = require('./app/routes/hotspots');
const passThrough = require('./app/routes/pass_through');
const createStorage = require('./app/models/redis_storage_adapter');
const { authenticate, authenticateClientEvent, usernameToLowerCase } = require('./app/middlewares/authenticate');
const { redirectToLogin, redirectToEvent } = require('./app/utils/redirect');
const { fetchEventConfig } = require('./app/utils/helpers');
const { fetchLoginBackground, fetchLoginLogo, fetchLoginPrompt, fetchDefaultRedirect } = require('./app/utils/helpers');
const handleErrors = require('./app/middlewares/error');

const privateKey = process.env.SESSION_KEY;

function environment(app) {
  const production = {
    createRedisClient: () => redis.createClient(process.env.REDIS_TLS_URL, { tls: { rejectUnauthorized: false } }),
    setupSession: (redisClient) => {
      app.set('trust proxy', 1);
      app.use(session({
        store: new RedisStore({ client: redisClient }),
        secret: privateKey,
        resave: true,
        saveUninitialized: false,
        rolling: true,
        cookie: { secure: true, maxAge: 3600000 },
      }));
    },
  };

  const development = {
    createRedisClient: () => redis.createClient(),
    setupSession: () => {
      app.use(session({
        secret: privateKey,
        resave: true,
        saveUninitialized: false,
      }));
    },
  };

  return app.get('env') === 'production' ? production : development;
}

const app = express();
const environmentFactory = environment(app);
const redisClient = environmentFactory.createRedisClient();
const store = createStorage({ database: redisClient });

passport.use(new LocalStrategy({ passReqToCallback: true },
  (req, username, password, done) => {
    const { client, event } = req.params;
    store.retrieveAttendee(client, event, username, (err, attendee) => {
      if (err) {
        done(err, false);
      } else {
        attendee.verifyPassword(password, result => done(null, result ? attendee : false));
      }
    });
  }));

passport.serializeUser((user, done) => {
  done(null, user.serialize());
});

passport.deserializeUser((user, done) => {
  done(null, Attendee.restore(user));
});

app.use(express.urlencoded());
app.use(express.json());
environmentFactory.setupSession(redisClient);
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(`${__dirname}/app/public`));
app.set('views', `${__dirname}/app/views`);
app.set('view engine', 'hbs');

app.get('/:client/:event/login', async (req, res) => {
  const loginPath = req.originalUrl;
  const loginBackground = await fetchLoginBackground(store);
  const loginLogo = await fetchLoginLogo(store);
  const loginPrompt = await fetchLoginPrompt(store);
  res.locals = {
    loginPath,
    loginBackground,
    loginLogo,
    loginPrompt,
  };
  res.render('login');
});

app.post('/:client/:event/login', usernameToLowerCase,
  async (req, res, next) => {
    const { client, event } = req.params;
    try {
      passport.authenticate('local', (err, user) => {
        if (err || !user) {
          redirectToLogin(req, res);
        } else {
          req.logIn(user, async (loginErr) => {
            if (loginErr) { throw loginErr; }

            const now = new Date().getTime();
            const startTime = await fetchEventConfig(store, client, event, 'start_time');
            const endTime = await fetchEventConfig(store, client, event, 'end_time');

            // event has not started yet
            if (parseInt(startTime, 10) > now) {
              return res.render('event_waiting_page', {
                encodedJson: encodeURIComponent(JSON.stringify({ startTime })),
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
  });

app.get('/:client/:event/logout', logout);

app.use('/hotspots', authenticate, hotspots(store));

app.get('/:client/:event/attendees', authenticateClientEvent, (req, res) => {
  const attendees = Object.values(req.sessionStore.sessions)
    .map(sessionsStore => JSON.parse(sessionsStore))
    .map(parsedSession => JSON.parse(parsedSession.passport.user))
    .map(user => user.name);
  res.locals = { attendees };
  res.render('attendees');
});

app.use('/:client/:event', authenticateClientEvent, passThrough(store));

app.use('*', async (req, res) => {
  if (req.isAuthenticated()) {
    redirectToEvent(req, res);
  } else {
    const defaultRedirect = await fetchDefaultRedirect(store);
    res.status(302).redirect(defaultRedirect);
  }
});

app.use(handleErrors);

if (__filename === process.argv[1]) {
  const port = process.env.PORT || '5000';

  app.set('port', port);

  const server = http.createServer(app);
  server.listen(port, () => console.log(`Listening on ${port}`));
}

exports.app = app;
