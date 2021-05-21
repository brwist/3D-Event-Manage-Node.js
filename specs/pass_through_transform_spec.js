const request = require('supertest');
const redisMock = require('redis-mock');
const AWSMock = require('mock-aws-s3');
const fs = require('fs');
const path = require('path');

AWSMock.config.basePath = './tmp/buckets';

require('redis').createClient = () => redisMock.createClient();
// eslint-disable-next-line import/no-extraneous-dependencies
require('aws-sdk').S3 = AWSMock.S3;

const Attendee = require('../app/models/attendee');
const createStorage = require('../app/models/redis_storage_adapter');
const assert = require('assert');

const { app } = require('../app');

describe('App passthrough', () => {
  const client = 'a_client';
  const event = 'an_event';

  const email = 'pedro1@pepito.com';
  const password = 'caliente';
  const eventRoot = `/${client}/${event}`;
  const fixurePath = path.join(__dirname, 'fixures/');

  const solarDay = 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  const tomorrow = now + solarDay;
  const yesterday = now - solarDay;

  const attendee = new Attendee({
    name: 'Pedro Pepito', client, event, email, password,
  });

  const label = {
    id: 'text9',
    client: attendee.client,
    event: attendee.event,
    text: 'Kitchen',
  };
  const secondLabel = {
    id: 'text10',
    client: attendee.client,
    event: attendee.event,
    text: 'Living room',
  };

  const thirdLabel = {
    id: 'text11',
    client: attendee.client,
    event: attendee.event,
    text: 'Bed room',
  };

  let database;
  let storage;

  before(() => {
    database = redisMock.createClient();
    storage = createStorage({ database });
    storage.storeLabel(label);
    storage.storeLabel(secondLabel);
    storage.storeLabel(thirdLabel);
    storage.storeAttendee(attendee);
    storage.storeEventConfiguration({ client, event, eventKey: 'start_time', eventValue: yesterday });
    storage.storeEventConfiguration({ client, event, eventKey: 'end_time', eventValue: tomorrow });
  });

  after(() => {
    database.flushall();
  });

  context('pass through transformation', () => {
    let agent;

    before((done) => {
      storage.storeAttendee(attendee);
      agent = request.agent(app);
      agent
        .post(`${eventRoot}/login`)
        .send({ username: attendee.email, password })
        .end(done);
    });

    context('pass through for /locale/en.txt', () => {
      context('when /locale/en.txt has no text having labels.<token>', () => {
        const content = fs.readFileSync(`${fixurePath}no_labels.txt`, 'utf8');
        let s3;

        before((done) => {
          s3 = AWSMock.S3({
            params: { Bucket: 'experiences' },
          });

          s3.putObject({ Key: 'a_room/locale/en.txt', Body: content.toString() }, () => {
            done();
          });
        });
        it('returns file as it is', (done) => {
          agent
            .get(`${eventRoot}/a_room/locale/en.txt`)
            .expect((res) => {
              assert.strictEqual(res.text, content.toString());
              assert.strictEqual(false, res.text.includes('labels.'));
            })
            .expect(200, done);
        });
      });
      context('when tooltip not found in redis', () => {
        const content = fs.readFileSync(`${fixurePath}unmatched_redis.txt`, 'utf8');
        let s3;

        before((done) => {
          s3 = AWSMock.S3({
            params: { Bucket: 'experiences' },
          });

          s3.putObject({ Key: 'a_room/locale/en.txt', Body: content.toString() }, () => {
            done();
          });
        });
        it('returns file as it is', (done) => {
          agent
            .get(`${eventRoot}/a_room/locale/en.txt`)
            .expect((res) => {
              assert.strictEqual(res.text, content.toString());
            })
            .expect(200, done);
        });
      });
      context('when tooltip found in redis', () => {
        const content = fs.readFileSync(`${fixurePath}single_matched_redis.txt`, 'utf8');
        let s3;

        before((done) => {
          s3 = AWSMock.S3({
            params: { Bucket: 'experiences' },
          });

          s3.putObject({ Key: 'a_room/locale/en.txt', Body: content.toString() }, () => {
            done();
          });
        });
        it('returns the modified locale/en.txt file', (done) => {
          agent
            .get(`${eventRoot}/a_room/locale/en.txt`)
            .expect((res) => {
              assert.strictEqual(res.text, content.toString().replace('labels.text10', 'Living room'));
              assert.strictEqual(true, res.text.includes('Living room'));
            })
            .expect(200, done);
        });
      });
      context('when tooltip found in redis with multiple match', () => {
        const content = fs.readFileSync(`${fixurePath}multiple_matched_redis.txt`, 'utf8');
        let s3;

        before((done) => {
          s3 = AWSMock.S3({
            params: { Bucket: 'experiences' },
          });

          s3.putObject({ Key: 'a_room/locale/en.txt', Body: content.toString() }, () => {
            done();
          });
        });
        it('returns the modified locale/en.txt file', (done) => {
          agent
            .get(`${eventRoot}/a_room/locale/en.txt`)
            .expect((res) => {
              const expectedText = content.toString()
                .replace('labels.text10', 'Living room')
                .replace('labels.text10', 'Living room')
                .replace('labels.text11', 'Bed room');
              assert.strictEqual(res.text, expectedText);
              assert.strictEqual(true, res.text.includes('Living room'));
              assert.strictEqual(true, res.text.includes('Bed room'));
            })
            .expect(200, done);
        });
      });
    });
  });
});
