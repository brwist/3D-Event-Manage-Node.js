function redirectToLogin(req, res) {
  const { client, event } = req.params
  res.status(302).redirect(`/${client}/${event}/login`);
}

function redirectToEvent(req, res) {
  const user = req.user
  res.status(302).redirect(`/${user.client}/${user.event}`);
}



module.exports = {
  redirectToLogin,
  redirectToEvent
}
