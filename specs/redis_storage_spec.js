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
    const hotspotId = 'an_id';
    const destinationUrl = 'https://test.com';
    const tooltip = 'tooltip1';
    const type = 'new_page';
    const redirect = {
      id: hotspotId,
      client,
      event,
      tooltip,
      type,
      destination_url: destinationUrl,
    };

    it('stores url for an event', () => {
      subject.storeRedirect(redirect);

      database.hget(`hotspot.${client}.${event}`, hotspotId, (err, rawHotspot) => {
        const hotspot = JSON.parse(rawHotspot);
        assert.strictEqual(hotspot.url, destinationUrl);
        assert.strictEqual(hotspot.tooltip, tooltip);
        assert.strictEqual(hotspot.type, type);
      });
    });

    it('fetches destination', () => {
      subject.storeRedirect(redirect);

      subject.retrieveRedirect(client, event, hotspotId, (hotspot) => {
        assert.strictEqual(hotspot.url, destinationUrl);
        assert.strictEqual(hotspot.tooltip, tooltip);
        assert.strictEqual(hotspot.type, type);
        assert.strictEqual(hotspot.type, type);
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

    it('list Attendees', () => {
      // save second attendee
      const secondAttendee = new Attendee({
        client,
        event,
        name: 'Gareth Bale',
        email: 'gbale@thfc.com',
        password: 'random123',
      });
      subject.storeAttendee(secondAttendee);

      subject.listAttendee(attendee.client, attendee.event, (err, foundAttendees) => {
        assert.strictEqual(err, null);
        assert.strictEqual(foundAttendees.length, 2);
        assert.deepStrictEqual([attendee, secondAttendee], foundAttendees);
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
});
