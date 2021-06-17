const assert = require('assert');
const redis = require('redis-mock');
const Attendee = require('../app/models/attendee');
const storage = require('../app/models/redis_storage_adapter');
const { unMarshall } = require('../app/utils/parser');

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

  context('label', () => {
    const labelId = 'an_id';
    const text = 'tooltip1';

    const label = {
      id: labelId,
      client,
      event,
      text,
    };

    it('stores label for an event', () => {
      subject.storeLabel(label);

      database.hget(`label.${client}.${event}`, labelId, (err, rawLabel) => {
        assert.strictEqual(unMarshall(rawLabel).text, text);
      });
    });

    it('fetches label', () => {
      subject.storeLabel(label);

      subject.retrieveLabel(client, event, labelId, (result) => {
        assert.strictEqual(result.text, label.text);
      });
    });
  });

  context('redirect', () => {
    const hotspotId = 'an_id';
    const destinationUrl = 'https://test.com';
    const tooltip = 'tooltip1';
    const type = 'new_page';
    const allowDownload = false;
    const redirect = {
      id: hotspotId,
      client,
      event,
      tooltip,
      type,
      destination_url: destinationUrl,
      allow_download: allowDownload,
    };

    it('stores url for an event', () => {
      subject.storeRedirect(redirect);

      database.hget(`hotspot.${client}.${event}`, hotspotId, (err, rawHotspot) => {
        const hotspot = unMarshall(rawHotspot);
        assert.strictEqual(hotspot.destination_url, destinationUrl);
        assert.strictEqual(hotspot.tooltip, tooltip);
        assert.strictEqual(hotspot.type, type);
        assert.strictEqual(hotspot.allow_download, allowDownload);
      });
    });

    it('fetches destination', () => {
      subject.storeRedirect(redirect);

      subject.retrieveRedirect(client, event, hotspotId, (hotspot) => {
        assert.strictEqual(hotspot.destination_url, destinationUrl);
        assert.strictEqual(hotspot.tooltip, tooltip);
        assert.strictEqual(hotspot.type, type);
        assert.strictEqual(hotspot.allow_download, allowDownload);
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

  context('event configuration', () => {
    const eventKey = 'main_entrance';
    const eventValue = 'myExperience';
    const eventConfig = {
      client,
      event,
      eventKey,
      eventValue,
    };

    it('stores event configuration', () => {
      subject.storeEventConfiguration(eventConfig);

      database.hget(`event.${client}.${event}`, eventKey, (err, value) => {
        assert.strictEqual(eventValue, value);
      });
    });

    it('fetches event configuration', () => {
      subject.storeEventConfiguration(eventConfig);

      subject.retrieveEventConfiguration(client, event, eventKey, (value) => {
        assert.strictEqual(eventValue, value);
      });
    });
  });
  context('system configuration', () => {
    const systemConfig = { name: 'default_redirect', value: '/home' };
    it('stores system configuration', () => {
      subject.storeSystemConfiguration(systemConfig);

      database.hget('config', systemConfig.name, (err, value) => {
        assert.strictEqual(systemConfig.value, value);
      });
    });

    it('fetches system configuration', () => {
      subject.storeSystemConfiguration(systemConfig);

      subject.retrieveSystemConfiguration(systemConfig.name, (value) => {
        assert.strictEqual(systemConfig.value, value);
      });
    });
  });
  context('environmental configuration', () => {
    const key = 'main_entrance/video.mp4';
    const value = 'contest/anotherfile.txt';
    const environmentalConfig = {
      client,
      event,
      key,
      value,
    };

    it('stores environmental configuration', () => {
      subject.storeEnvironmentalConfiguration(environmentalConfig);

      database.hget(`environmental.${client}.${event}`, key, (err, environmentalValue) => {
        assert.strictEqual(value, environmentalValue);
      });
    });

    it('fetches environmental configuration', () => {
      subject.storeEnvironmentalConfiguration(environmentalConfig);

      subject.retrieveEnvironmentalConfiguration(client, event, key, (environmentalValue) => {
        assert.strictEqual(value, environmentalValue);
      });
    });

    it('returns null when environmental configuration not found', () => {
      subject.retrieveEnvironmentalConfiguration(client, event, 'random-key', (environmentalValue) => {
        assert.strictEqual(null, environmentalValue);
      });
    });
  });
  context('room Attendee', () => {
    let attendee1; let
      attendee2;
    const room = 'hall';
    before(() => {
      attendee1 = new Attendee({
        client: 'a_client',
        event: 'an_event',
        name: 'Pedro Pepito',
        email,
        password: 'abcdefg09876',
      });
      attendee2 = new Attendee({
        client: 'a_client',
        event: 'an_event',
        name: 'Other Attendee',
        email: 'otherperson@gmail.com',
        password: 'abcdefg09876',
      });
    });
    it('stores attendees visiting given room', () => {
      subject.storeRoomAttendee(room, attendee1);

      database.get(`room_attendee.${attendee1.client}.${attendee1.event}.${room}.${attendee1.email}`, (err, name) => {
        assert.deepStrictEqual(attendee1.name, name);
      });
    });
    it('fetches attendees visiting given room', () => {
      subject.storeRoomAttendee(room, attendee2);

      subject.listRoomAttendee(client, event, room, (roomAttendees) => {
        assert.strictEqual([attendee1.name, attendee2.name], roomAttendees);
      });
    });
  });
});
