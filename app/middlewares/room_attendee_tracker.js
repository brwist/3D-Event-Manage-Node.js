const debug = require('debug')('room_attendee_tracker');

module.exports = {
  track: (store) => {
    return (async (req, res, next) => {
      debug('tracking user to room...');
      store.storeRoomAttendee(req.params.experience, req.user)
      return next();
    });
  }
}
