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

  context('PowerPoint', () => {
    it('selects PowerPoint', () => {
      assert.strictEqual('media/powerpoint', mapMimeToView('application/vnd.ms-powerpoint'));
    });

    it('selects PowerPoint', () => {
      assert.strictEqual('media/powerpoint', mapMimeToView('application/vnd.openxmlformats-officedocument.presentationml.presentation'));
    });
  });

  context('Image', () => {
    it('selects Image', () => {
      assert.strictEqual('media/image', mapMimeToView('image/gif'));
    });

    it('selects Image', () => {
      assert.strictEqual('media/image', mapMimeToView('image/jpeg'));
    });

    it('selects Image', () => {
      assert.strictEqual('media/image', mapMimeToView('image/png'));
    });

    it('selects Image', () => {
      assert.strictEqual('media/image', mapMimeToView('image/webp'));
    });
  });

  context('unknown media', () => {
    it('renders unknown media page', () => {
      assert.strictEqual('media/unknown', mapMimeToView('video/something'));
    });
  });
});
