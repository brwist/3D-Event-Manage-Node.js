const debug = require('debug')('redis-storage-adapter');

const Attendee = require('./attendee');

module.exports = function storage(options) {
  function computeEventKey(client, event) {
    return `attendee.${client}.${event}`;
  }

  function computeHotspotKey(client, event) {
    return `hotspot.${client}.${event}`;
  }

  return {
    _database: options.database,
    storeRedirect(value) {
      this._database.hset(computeHotspotKey(value.client, value.event), value.source_path, value.destination_url);
    },
    retrieveRedirect(client, event, sourcePath, callback) {
      const key = computeHotspotKey(client, event);
      this._database.hget(key, sourcePath, (err, reply) => {
        debug('Retrieve redirect %s %s result: %0 error: %0', key, sourcePath, reply, err);
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
  };
};
