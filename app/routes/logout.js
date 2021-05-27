module.exports = function(req, res) {
  const { client, event } = req.params;
  req.logout();
  res.redirect(`/${client}/${event}/login`);
}
