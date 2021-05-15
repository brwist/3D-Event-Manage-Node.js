
function marshall(object) {
  return JSON.stringify(object);
}

function unMarshall(string) {
  return JSON.parse(string);
}

module.exports = {
  marshall,
  unMarshall
}
