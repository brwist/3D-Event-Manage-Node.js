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
  const newPageHotSpotId = 'new_page_hotspot';
  const sourcePath = `/hotspots/${hotspotId}`;
  const destinationUrl = 'https://test.com';

  const email = 'pedro@pepito.com';
  const password = 'caliente';
  const tooltip = 'Living room';
  const eventRoot = `/${client}/${event}`;

  const attendee = new Attendee({
    name: 'Pedro Pepito', client, event, email, password,
  });

  const redirect = {
    id: hotspotId,
    client: attendee.client,
    event: attendee.event,
    destination_url: destinationUrl,
    tooltip,
  };

  const newPageRedirect = {
    id: newPageHotSpotId,
    client: attendee.client,
    event: attendee.event,
    type: 'new_page',
    destination_url: destinationUrl,
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

  context('logged in', () => {
    let agent;

    before((done) => {
      agent = request.agent(app);
      agent
        .post(`${eventRoot}/login`)
        .send({ username: attendee.email, password })
        .end(done);
    });

    context('attendees', () => {
      const attendeesUrl = `${eventRoot}/attendees`;
      it('shows attendees page', (done) => {
        agent
          .get(attendeesUrl)
          .expect(200, done);
      });
    });

    context('hotspots', () => {
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
          .expect(404, done);
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

    context('pass through default room', () => {
      const eventKey = 'default_room';
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
