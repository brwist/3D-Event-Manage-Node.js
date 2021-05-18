const { GeneralError } = require('../utils/errors');

const handleErrors = (error, req, res, next) => {
  let httpStatus;
  let page;

  // set value of httpStatus
  if(error.status) {
    httpStatus = error.status;
  } else if (error instanceof GeneralError) {
    httpStatus = error.getCode();
  } else {
    httpStatus = 500;
  }

  // set page to render
  if(httpStatus === 404) {
    page = '404';
  } else {
    res.local = {
      message: err.message || 'Something went wrong',
      error
    }
    page = 'error';
  }
  return res.status(httpStatus).type('html').render(page);
}

module.exports = handleErrors;
