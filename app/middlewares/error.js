const handleErrors = (error, req, res, next) => {
  const httpStatus = error.status || error.getCode() || 500;
  let page;
  if(httpStatus === 404) {
    page = '404';
  } else {
    res.local = {
      message: err.message || 'Something went wrong',
      error
    }
    page = 'error'
  }
  return res.status(httpStatus).render(page);
}

module.exports = handleErrors;
