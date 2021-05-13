const debug = require('debug')('redis-storage-adapter');

const Attendee = require('./attendee');
const EventConfiguration = require('./event_configuration');

module.exports = function storage(options) {
  function computeEventKey(client, event) {
    return `attendee.${client}.${event}`;
  }

  function computeHotspotKey(client, event) {
    return `hotspot.${client}.${event}`;
  }

  function getDefaultRoomKey() {
    return 'default-room';
  }

  return {
    _database: options.database,
    storeRedirect(value) {
      this._database.hset(computeHotspotKey(value.client, value.event), value.source_path, value.destination_url);
    },
    retrieveRedirect(client, event, sourcePath, callback) {
      const key = computeHotspotKey(client, event);
      this._database.hget(key, sourcePath, (err, reply) => {
        debug('Retrieve redirect %s %s result: %o error: %o', key, sourcePath, reply, err);
        callback(reply);
      });
    },
    storeAttendee(attendee) {
      this._database.hset(computeEventKey(attendee.client, attendee.event), attendee.email, attendee.serialize());
    },
    retrieveAttendee(client, event, email, callback) {
      this._database.hget(computeEventKey(client, event), email, (err, reply) => {
        if (!reply) {
          callback('Attendee Not Found', null);
        } else {
          callback(null, Attendee.restore(reply));
        }
      });
    },
    storeEventConfiguration(event, config) {
      const eventConfiguration = new EventConfiguration(config);
      this._database.hset(getDefaultRoomKey(), event, eventConfiguration.serialize());
    },
    retrieveEventConfiguration(event, callback) {
      this._database.hget(getDefaultRoomKey(), event, (err, reply) => {
        if (!reply) {
          callback(`Default Room Not Found for Event ${event}`, null);
        } else {
          callback(null, EventConfiguration.restore(reply));
        }
      });
    },
  };
};
