const { publishKey, subscribeKey } = require('../configs/pubnub');
module.exports = function(req, res) {
  const { client, event } = req.params;
  const userName = req.user._name
  const viewData = {
    client,
    event,
    userName,
    publishKey,
    subscribeKey,
  }
  return res.render('chat', {
    encodedJson: encodeURIComponent(JSON.stringify({...viewData})),
  });
}
