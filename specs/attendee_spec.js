const assert = require('assert');
const bcrypt = require('bcrypt');

const Attendee = require('../app/models/attendee');

describe('Attendee', () => {
  context('event user', () => {
    let attendee;
    const client = 'a_client';
    const event = 'an_event';
    const name = 'Test User';
    const email = 'test@user.com';
    const password = 'abcdefg12345';

    before(() => {
      attendee = new Attendee({
        client, event, name, email, password,
      });
    });

    it('verifies password', (done) => {
      attendee.verifyPassword(password, (success) => {
        assert.strictEqual(true, success);
        attendee.verifyPassword('wrong', (failure) => {
          assert.strictEqual(false, failure);
          done();
        });
      });
    });

    it('stores attendee', () => {
      assert.strictEqual(attendee.client, client);
      assert.strictEqual(attendee.event, event);
      assert.strictEqual(attendee.name, name);
      assert.strictEqual(attendee.email, email);
      assert.strictEqual(true, bcrypt.compareSync(password, attendee.encryptedPassword));
    });

    it('is equal', () => {
      const other = new Attendee({
        client, event, name, email, password,
      });
      assert(attendee.isEqual(other));
    });

    it('serializes', () => {
      assert(JSON.stringify(attendee), attendee.serialize());
    });

    it('deserializes', () => {
      const deseralized = Attendee.restore(attendee.serialize());
      assert(deseralized.isEqual(attendee));
    });
  });
});
