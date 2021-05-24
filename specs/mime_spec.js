const assert = require('assert');

const { mapMimeToView } = require('../app/configs/mime');

describe('Mime View Selector', () => {
  context('pdf', () => {
    it('selects pdf', () => {
      assert.strictEqual('media/pdf', mapMimeToView('application/pdf'));
    });
  });

  context('video', () => {
    it('selects video for quicktime', () => {
      assert.strictEqual('media/video', mapMimeToView('video/quicktime'));
    });

    it('selects video for mp4', () => {
      assert.strictEqual('media/video', mapMimeToView('video/mp4'));
    });
  });

  context('unknown media', () => {
    it('renders unknown media page', () => {
      assert.strictEqual('media/unknown', mapMimeToView('video/something'));
    });
  });
});
