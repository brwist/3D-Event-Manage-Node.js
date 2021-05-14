const debug = require('debug')('redis-storage-adapter');

const Attendee = require('./attendee');

module.exports = function storage(options) {
  function computeEventKey(client, event) {
    return `attendee.${client}.${event}`;
  }

  function computeHotspotKey(client, event) {
    return `hotspot.${client}.${event}`;
  }

  function getConfigurationKey(client, event, accessor) {
    return `configuration.${client}.${event}.${accessor}`;
  }

  return {
    _database: options.database,
    storeRedirect(value) {
      const content = JSON.stringify({ url: value.destination_url, tooltip: value.tooltip });
      this._database.hset(computeHotspotKey(value.client, value.event), value.source_path, content);
    },
    retrieveRedirect(client, event, sourcePath, callback) {
      const key = computeHotspotKey(client, event);
      this._database.hget(key, sourcePath, (err, reply) => {
        debug('Retrieve redirect %s %s result: %o error: %o', key, sourcePath, reply, err);
        callback(JSON.parse(reply));
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
    listAttendee(client, event, callback) {
      this._database.hvals(computeEventKey(client, event), (err, reply) => {
        if (!reply) {
          callback('Attendees Not Found', null);
        } else {
          callback(null, reply.map(attendee => Attendee.restore(attendee)));
        }
      });
    },
    storeEventConfiguration(attendee, accessor, value) {
      this._database.set(getConfigurationKey(attendee.client, attendee.event, accessor), value);
    },
    retrieveEventConfiguration(attendee, accessor, callback) {
      this._database.get(getConfigurationKey(attendee.client, attendee.event, accessor), (err, reply) => {
        if (!reply) {
          callback(`${accessor} Not Found`, null);
        } else {
          callback(null, reply);
        }
      });
    },
  };
};
