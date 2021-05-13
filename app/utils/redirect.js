function redirectToLogin(req, res) {
  const { client, event } = req.params
  res.status(302).redirect(`/${client}/${event}/login`);
}

module.exports = {
  redirectToLogin
}
