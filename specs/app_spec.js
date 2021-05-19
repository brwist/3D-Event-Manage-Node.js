const request = require('supertest');
const redisMock = require('redis-mock');
const AWSMock = require('mock-aws-s3');

AWSMock.config.basePath = './tmp/buckets';

require('redis').createClient = () => redisMock.createClient();
// eslint-disable-next-line import/no-extraneous-dependencies
require('aws-sdk').S3 = AWSMock.S3;

const Attendee = require('../app/models/attendee');
const createStorage = require('../app/models/redis_storage_adapter');
const assert = require('assert');

const { app } = require('../app');

describe('App', () => {
  const client = 'a_client';
  const event = 'an_event';
  const hotspotId = 'an_id';
  const presignHotSpotId = 'presign_hotspot';
  const newPageHotSpotId = 'new_page_hotspot';
  const sourcePath = `/hotspots/${hotspotId}`;
  const destinationUrl = 'https://test.com';

  const email = 'pedro@pepito.com';
  const password = 'caliente';
  const eventRoot = `/${client}/${event}`;
  const solarDay = 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  const tomorrow = now + solarDay;
  const yesterday = now - solarDay;
  const page404 = `<!DOCTYPE html>
<html>
  <head>
    <title></title>
    <link rel='stylesheet' href='/stylesheets/style.css' />
  </head>
  <body>
    <h1>Oops!</h1>
<p>We could not find what you were looking for.</p>

  </body>
</html>
`;

  const attendee = new Attendee({
    name: 'Pedro Pepito', client, event, email, password,
  });

  const attendee2 = new Attendee({
    name: 'User 2', client, event, email: 'user2@gmail.com', password,
  });

  const redirect = {
    id: hotspotId,
    client: attendee.client,
    event: attendee.event,
    destination_url: destinationUrl,
    presign: false,
  };

  const newPageRedirect = {
    id: newPageHotSpotId,
    client: attendee.client,
    event: attendee.event,
    type: 'new_page',
    destination_url: destinationUrl,
    presign: false,
  };

  const preSignRedirect = {
    id: presignHotSpotId,
    client: attendee.client,
    event: attendee.event,
    destination_url: 'folder1/my_file.txt',
    presign: true,
  };

  let database;
  let storage;

  before(() => {
    database = redisMock.createClient();
    storage = createStorage({ database });
    storage.storeRedirect(redirect);
    storage.storeRedirect(newPageRedirect);
  });

  after(() => {
    database.flushall();
  });

  describe('not logged in', () => {
    context('hotspots', () => {
      it('does not allow ', (done) => {
        request(app)
          .get(sourcePath)
          .expect(401, done);
      });
    });
    context('pass through', () => {
      it('does not allow ', (done) => {
        request(app)
          .get(eventRoot)
          .expect(302, done);
      });
      it('redirects to login', (done) => {
        request(app)
          .get(eventRoot)
          .expect('Location', `${eventRoot}/login`, done);
      });
    });
    context('attendees', () => {
      it('does not allow ', (done) => {
        request(app)
          .get(`${eventRoot}/attendees`)
          .expect(302, done);
      });
      it('redirects to login', (done) => {
        request(app)
          .get(`${eventRoot}/attendees`)
          .expect('Location', `${eventRoot}/login`, done);
      });
    });
  });

  describe('logging in', () => {
    before(() => {
      storage.storeAttendee(attendee);
      storage.storeAttendee(attendee2);
    });
    describe('and event is not live', () => {
      it('returns 404 when logging in', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email, password })
          .expect((res) => {
            assert.strictEqual(res.text, page404);
          })
          .expect(404, done);
      });
    });
    describe('and event is live', () => {
      before(() => {
        storage.storeAttendee(attendee);
        storage.storeEventConfiguration({ client, event, eventKey: 'start_time', eventValue: yesterday });
        storage.storeEventConfiguration({ client, event, eventKey: 'end_time', eventValue: tomorrow });
      });
      it('redirect to experience', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email, password })
          .expect('Location', eventRoot)
          .expect(302, done);
      });

      it('redirect to login on failure', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email, password: 'not the right password' })
          .expect('Location', `${eventRoot}/login`)
          .expect(302, done);
      });

      it('redirect to login on user not found', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: 'who@what.where', password: 'not the right password' })
          .expect('Location', `${eventRoot}/login`)
          .expect(302, done);
      });
    });
  });

  describe('logged in', () => {
    let agent;

    before((done) => {
      storage.storeEventConfiguration({ client, event, eventKey: 'start_time', eventValue: yesterday });
      storage.storeEventConfiguration({ client, event, eventKey: 'end_time', eventValue: tomorrow });
      agent = request.agent(app);
      agent
        .post(`${eventRoot}/login`)
        .send({ username: attendee.email, password })
        .end(done);
    });

    context('attendees', () => {
      const attendeesUrl = `${eventRoot}/attendees`;
      it('shows logged in attendees', (done) => {
        agent
          .get(attendeesUrl)
          .expect((res) => {
            assert.strictEqual(true, res.text.includes('Pedro Pepito'));
          })
          .expect((res) => {
            assert.strictEqual(false, res.text.includes('User 2'));
          })
          .expect(200, done);
      });
    });

    context('hotspots', () => {
      context('when hotspot has presign set true', () => {
        before((done) => {
          storage.storeRedirect(preSignRedirect);
          const s3 = AWSMock.S3({
            params: { Bucket: 'contents' },
          });

          s3.putObject({ Key: preSignRedirect.destination_url, Body: 'content' }, () => {
            done();
          });
        });
        it('generates presigned url and renders page with given link', (done) => {
          agent
            .get(`/hotspots/${presignHotSpotId}`)
            .expect((res) => {
              assert.strictEqual(true, res.text.includes('Your file is here'));
            })
            .expect(200, done);
        });
      });
      context('when hotspot has presigned set falsy value', () => {
        it('redirects to hotspot path', (done) => {
          agent
            .get(sourcePath)
            .expect('Location', destinationUrl)
            .expect(302, done);
        });

        it('redirects to hotspot path when parameters are present', (done) => {
          agent
            .get(`${sourcePath}?v=123`)
            .expect('Location', destinationUrl)
            .expect(302, done);
        });

        it('renders an html page with destination_url when hotspot redirect type is new_page', (done) => {
          const response = `<a href="${newPageRedirect.destination_url}" target="_blank">${newPageRedirect.destination_url}</a>`;
          agent
            .get(`${sourcePath}/new_page_hotspot`)
            .expect((res) => {
              assert.strictEqual(true, res.text.includes(response));
            })
            .expect(200, done);
        });

        it('returns 404', (done) => {
          agent
            .get('/hotspots/notfound')
            .expect((res) => {
              assert.strictEqual(res.text, page404);
            })
            .expect(404, done);
        });
      });
    });

    context('pass through', () => {
      const content = '<html><body>Hello</body></html>';
      let s3;

      before((done) => {
        s3 = AWSMock.S3({
          params: { Bucket: 'experiences' },
        });

        s3.putObject({ Key: 'something/something.html', Body: content }, () => {
          done();
        });
      });

      it('returns the file', (done) => {
        agent
          .get(`${eventRoot}/something/something.html`)
          .expect((res) => {
            assert.strictEqual(res.text, content);
          })
          .expect(200, done);
      });
    });

    context('pass through main entrance', () => {
      const eventKey = 'main_entrance';
      const eventValue = 'experience1';

      before((done) => {
        storage.storeEventConfiguration({ client, event, eventKey, eventValue });
        done();
      });

      it('redirects to default room', (done) => {
        agent
          .get(`${eventRoot}`)
          .expect('Location', `${eventRoot}/${eventValue}/index.htm`)
          .expect(302, done);
      });
    });
  });
});
