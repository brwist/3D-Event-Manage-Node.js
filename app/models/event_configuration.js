class EventConfiguration {
  constructor(options) {
    this._configuration = options.configuration;
  }

  get configuration() {
    return this._configuration;
  }

  serialize() {
    return JSON.stringify({
      configuration: this.configuration,
    });
  }

  isEqual(other) {
    if (this._configuration === other._configuration) {
      return true;
    }
    // Check each values of each key
    return Object.keys(this._configuration).some(key => this._configuration[key] === other._configuration[key]);
  }

  static restore(serialized) {
    return new EventConfiguration(JSON.parse(serialized));
  }
}

module.exports = EventConfiguration;
