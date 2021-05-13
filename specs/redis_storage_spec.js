const assert = require('assert');
const redis = require('redis-mock');
const Attendee = require('../app/models/attendee');
const storage = require('../app/models/redis_storage_adapter');

describe('RedisStorage', () => {
  const client = 'a_client';
  const event = 'an_event';
  const email = 'abc@123.com';

  let database;
  let subject;

  before(() => {
    database = redis.createClient();
    subject = storage({ database });
  });

  after(() => {
    database.flushall();
  });

  context('redirect', () => {
    const sourcePath = '/acd/efg.html';
    const destinationUrl = 'https://test.com';
    const redirect = {
      client,
      event,
      source_path: sourcePath,
      destination_url: destinationUrl,
    };

    it('stores url for an event', () => {
      subject.storeRedirect(redirect);

      database.hget(`hotspot.${client}.${event}`, sourcePath, (err, reply) => {
        assert.strictEqual(reply, destinationUrl);
      });
    });

    it('fetches destination', () => {
      subject.storeRedirect(redirect);

      subject.retrieveRedirect(client, event, sourcePath, (url) => {
        assert.strictEqual(url, destinationUrl);
      });
    });
  });

  context('attendee', () => {
    let attendee;
    before(() => {
      attendee = new Attendee({
        client: 'a_client',
        event: 'an_event',
        name: 'Pedro Pepito',
        email,
        password: 'abcdefg09876',
      });
    });

    it('stores attendee', () => {
      subject.storeAttendee(attendee);

      database.hget(`attendee.${attendee.client}.${attendee.event}`, attendee.email, (err, reply) => {
        assert(attendee.isEqual(Attendee.restore(reply)));
      });
    });

    it('retrieve attendee', () => {
      subject.retrieveAttendee(attendee.client, attendee.event, attendee.email, (err, foundAttendee) => {
        assert.strictEqual(err, null);
        assert(attendee.isEqual(foundAttendee));
      });
    });

    it('returns error when attendee not found', () => {
      subject.retrieveAttendee(attendee.client, attendee.event, 'nobody', (err, foundAttendee) => {
        assert.strictEqual(err === null, false);
        assert.strictEqual(foundAttendee, null);
      });

      it('returns error when event not found', () => {
        subject.retrieveAttendee(attendee.client, 'noevent', attendee.email, (err, foundAttendee) => {
          assert.strictEqual(err === null, false);
          assert.strictEqual(foundAttendee, null);
        });
      });
    });
  });

  context('event configuration', () => {
    let attendee; let accessor; let
      value;
    before(() => {
      attendee = new Attendee({
        client,
        event,
      });
      accessor = 'default_room';
      value = '/index.html';
    });

    it('stores event configuration', () => {
      subject.storeEventConfiguration(attendee, accessor, value);

      database.get(`configuration.${attendee.client}.${attendee.event}.${accessor}`, (err, reply) => {
        assert.strictEqual(value, reply);
      });
    });

    it('retrieve event configuration', () => {
      subject.retrieveEventConfiguration(attendee, accessor, (err, foundEventConfiguration) => {
        assert.strictEqual(err, null);
        assert.strictEqual(value, foundEventConfiguration);
      });
    });

    it('returns error when event configuration not found', () => {
      subject.retrieveEventConfiguration(attendee, 'random-accessor', (err, foundEventConfiguration) => {
        assert.strictEqual(err === null, false);
        assert.strictEqual(foundEventConfiguration, null);
      });
    });
  });
});
