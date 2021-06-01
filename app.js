const redis = require('redis');
const http = require('http');
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config();

const createAuthentication = require('./app/routes/authentication');
const Attendee = require('./app/models/attendee');
const hotspots = require('./app/routes/hotspots');
const passThrough = require('./app/routes/pass_through');
const createStorage = require('./app/models/redis_storage_adapter');
const { redirectToEvent } = require('./app/utils/redirect');
const { fetchDefaultRedirect } = require('./app/utils/helpers');
const loadConfig = require('./app/middlewares/load_config');
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
const authentication = createAuthentication(store, passport);

passport.use(new LocalStrategy({ passReqToCallback: true },
  (req, username, password, done) => {
    const { client, event } = req.params;
    store.retrieveAttendee(client, event, username.toLowerCase(), (err, attendee) => {
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

app.use(loadConfig.initialize(store));
app.get('/:client/:event/login', authentication.loginPage);
app.post('/:client/:event/login', authentication.login);
app.get('/:client/:event/logout', authentication.logout);

app.use('/hotspots', authentication.ensureAuthenticated, hotspots(store));

app.get('/:client/:event/attendees', authentication.redirectUnauthenticated, (req, res) => {
  const attendees = Object.values(req.sessionStore.sessions)
    .map(sessionsStore => JSON.parse(sessionsStore))
    .map(parsedSession => JSON.parse(parsedSession.passport.user))
    .map(user => user.name);
  res.locals = { attendees };
  res.render('attendees');
});

app.use('/:client/:event', authentication.redirectUnauthenticated, passThrough(store));

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
