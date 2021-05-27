const debug = require('debug')('redis-storage-adapter');

const Attendee = require('./attendee');

const { marshall, unMarshall } = require('../utils/parser');

module.exports = function storage(options) {
  function computeEventKey(client, event) {
    return `attendee.${client}.${event}`;
  }

  function computeLabelKey(client, event) {
    return `label.${client}.${event}`;
  }

  function computeHotspotKey(client, event) {
    return `hotspot.${client}.${event}`;
  }

  function computeEventConfigurationKey(client, event) {
    return `event.${client}.${event}`;
  }

  function getSystemConfigurationKey() {
    return 'config';
  }

  return {
    _database: options.database,
    storeLabel(value) {
      const content = marshall({ text: value.text });
      this._database.hset(computeLabelKey(value.client, value.event), value.id, content);
    },
    retrieveLabel(client, event, labelId, callback) {
      const key = computeLabelKey(client, event);
      this._database.hget(key, labelId, (err, reply) => {
        callback(unMarshall(reply));
      });
    },
    storeRedirect(value) {
      const content = marshall({
        destination_url: value.destination_url,
        tooltip: value.tooltip,
        type: value.type,
        presign: value.presign,
        mime_type: value.mime_type,
        disable_downloads: value.disable_downloads,
      });
      this._database.hset(computeHotspotKey(value.client, value.event), value.id, content);
    },
    retrieveRedirect(client, event, sourcePath, callback) {
      const key = computeHotspotKey(client, event);
      this._database.hget(key, sourcePath, (err, reply) => {
        debug('Retrieve redirect %s %s result: %o error: %o', key, sourcePath, reply, err);
        callback(unMarshall(reply));
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
    storeEventConfiguration(config) {
      const key = computeEventConfigurationKey(config.client, config.event);
      this._database.hset(key, config.eventKey, config.eventValue);
    },
    retrieveEventConfiguration(client, event, eventKey, callback) {
      const key = computeEventConfigurationKey(client, event);
      this._database.hget(key, eventKey, (err, reply) => {
        debug('Event Configuration %s %s result: %o error: %o', key, eventKey, reply, err);
        callback(reply);
      });
    },
    storeSystemConfiguration(config) {
      const key = getSystemConfigurationKey();
      this._database.hset(key, config.name, config.value);
    },
    retrieveSystemConfiguration(configKey, callback) {
      const key = getSystemConfigurationKey();
      this._database.hget(key, configKey, (err, reply) => {
        debug('System Configuration %s %s result: %o error: %o', key, configKey, reply, err);
        callback(reply);
      });
    },
  };
};
