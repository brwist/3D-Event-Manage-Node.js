class GeneralError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }

  getCode() {
    if (this instanceof NotFoundError) {
      return 404;
    }
    return 500;
  }
}

class NotFoundError extends GeneralError { }

module.exports = {
  GeneralError,
  NotFoundError
};
