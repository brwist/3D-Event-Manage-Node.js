const redis = require('redis');
const http = require('http');
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config();

const Attendee = require('./app/models/attendee');
const hotspots = require('./app/routes/hotspots');
const passThrough = require('./app/routes/pass_through');
const createStorage = require('./app/models/redis_storage_adapter');
const { authenticate, authenticateClientEvent } = require('./app/middlewares/authenticate');
const { redirectToLogin } = require('./app/utils/redirect');
const { isEventLive } = require('./app/utils/helpers');
const { NotFoundError } = require('./app/utils/errors');
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
        cookie: { secure: true },
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

app.get('/:client/:event/login', (req, res) => {
  res.locals = {
    loginPath: req.originalUrl,
  };
  res.render('login');
});

app.post('/:client/:event/login',
  async (req, res, next) => {
    const { client, event } = req.params;
    try {
      const eventLive = await isEventLive(store, client, event);
      // if event is not live then send NotFoundError
      if (!eventLive) {
        throw new NotFoundError('Event has not started or has finished.');
      }
      passport.authenticate('local', (err, user) => {
        if (err || !user) {
          redirectToLogin(req, res);
        } else {
          req.logIn(user, (loginErr) => {
            if (loginErr) { throw loginErr; }

            res.redirect(`/${client}/${event}`);
          });
        }
      })(req, res, next);
    } catch (err) {
      next(err);
    }
  });

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

app.use(handleErrors);

if (__filename === process.argv[1]) {
  const port = process.env.PORT || '5000';

  app.set('port', port);

  const server = http.createServer(app);
  server.listen(port, () => console.log(`Listening on ${port}`));
}

exports.app = app;
