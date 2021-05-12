const assert = require('assert');
const User = require('../app/models/user');

describe('User', () => {
  it('is not valid if nothing is set', () => {
    assert.strictEqual(false, User.fromPayload({}).isValid());
  });

  context('admin user', () => {
    const payload = { role: 'admin' };
    let user;
    before(() => {
      user = User.fromPayload(payload);
    });

    it('creates from payload', () => {
      assert.strictEqual(true, user.admin);
    });

    it('is valid', () => {
      assert(user.isValid());
    });
  });

  context('event user', () => {
    const payload = { user: 'eric', event: 'super' };

    let user;
    before(() => {
      user = User.fromPayload(payload);
    });

    it('creates from payload', () => {
      assert.strictEqual(false, user.admin);
      assert.strictEqual(payload.user, user.name);
      assert.strictEqual(payload.event, user.event);
    });

    it('is valid', () => {
      assert(user.isValid());
    });
  });
});
