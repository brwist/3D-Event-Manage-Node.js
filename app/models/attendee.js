const bcrypt = require('bcrypt');

function encryptPassword(password) {
  const salt = bcrypt.genSaltSync(10);

  return bcrypt.hashSync(password, salt);
}

class Attendee {
  constructor(options) {
    this._client = options.client;
    this._event = options.event;
    this._name = options.name;
    this._email = options.email;
    if (typeof options.encrypted_password !== 'undefined') {
      this._encrypted_password = options.encrypted_password;
    }
    if (typeof options.password !== 'undefined') {
      this._encrypted_password = encryptPassword(options.password);
    }
  }

  get client() {
    return this._client;
  }

  get event() {
    return this._event;
  }

  get name() {
    return this._name;
  }

  get email() {
    return this._email;
  }

  get encryptedPassword() {
    return this._encrypted_password;
  }

  isEqual(other) {
    return other._client === this._client
      && other._event === this._event
      && other._email === this._email;
  }

  verifyPassword(password, callback) {
    bcrypt.compare(password, this._encrypted_password, (err, result) => {
      callback(result);
    });
  }

  serialize() {
    return JSON.stringify({
      client: this.client,
      event: this.event,
      name: this.name,
      email: this.email,
      encrypted_password: this.encryptedPassword,
    });
  }

  static restore(serialized) {
    return new Attendee(JSON.parse(serialized));
  }
}

module.exports = Attendee;
