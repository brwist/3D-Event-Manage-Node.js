class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this._status = 404;
  }

  get status() {
    return this._status;
  }
}

module.exports = {
  NotFoundError,
};
