function _validatePayload(payload) {
  if (typeof (payload.role) !== 'undefined') {
    return true;
  }

  if (typeof (payload.user) !== 'undefined' && typeof (payload.event) !== 'undefined') {
    return true;
  }

  return false;
}

class User {
  constructor(options) {
    this._role = options.role;
    this._name = options.user;
    this._event = options.event;
    this._valid = _validatePayload(options);
  }

  get admin() {
    return this._role === 'admin';
  }

  get name() {
    return this._name;
  }

  get event() {
    return this._event;
  }

  isValid() {
    return this._valid;
  }

  static fromPayload(payload) {
    return new User(payload);
  }
}

module.exports = User;
