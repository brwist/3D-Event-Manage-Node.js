const request = require('supertest');
const redisMock = require('redis-mock');
const AWSMock = require('mock-aws-s3');

AWSMock.config.basePath = './tmp/buckets';

require('redis').createClient = () => redisMock.createClient();
// eslint-disable-next-line import/no-extraneous-dependencies
require('aws-sdk').S3 = AWSMock.S3;

const Attendee = require('../app/models/attendee');
const createStorage = require('../app/models/redis_storage_adapter');
const assert = require('assert');

const { app } = require('../app');

describe('App', () => {
  const client = 'a_client';
  const event = 'an_event';
  const hotspotId = 'an_id';
  const systemLoginBackground = 'config/my-image.jpg';
  const systemLoginLogo = 'config/my-logo.png';
  const systemLoginPrompt = 'Default Prompt';
  const systemDefaultRedirect = '/default/redirect';
  const presignHotSpotId = 'presign_hotspot';
  const newPageHotSpotId = 'new_page_hotspot';
  const pdfHotspotId = 'pdf_mime_hotspot';
  const sourcePath = `/hotspots/${hotspotId}`;
  const destinationUrl = 'https://test.com';

  const email = 'pedro@pepito.com';
  const password = 'caliente';
  const eventRoot = `/${client}/${event}`;
  const solarDay = 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  const tomorrow = now + solarDay;
  const yesterday = now - solarDay;

  const attendee = new Attendee({
    name: 'Pedro Pepito', client, event, email, password,
  });

  const attendee2 = new Attendee({
    name: 'User 2', client, event, email: 'user2@gmail.com', password,
  });

  const redirect = {
    id: hotspotId,
    client: attendee.client,
    event: attendee.event,
    destination_url: destinationUrl,
    presign: false,
  };

  const newPageRedirect = {
    id: newPageHotSpotId,
    client: attendee.client,
    event: attendee.event,
    type: 'new_page',
    destination_url: destinationUrl,
    presign: false,
  };

  const preSignRedirect = {
    id: presignHotSpotId,
    client: attendee.client,
    event: attendee.event,
    destination_url: 'folder1/my_file.txt',
    presign: true,
  };

  const preSignRedirectNewPage = {
    id: `${presignHotSpotId}123`,
    client: attendee.client,
    event: attendee.event,
    type: 'new_page',
    destination_url: 'folder1/my_file.txt',
    presign: false,
  };

  const pdfRedirect = {
    id: pdfHotspotId,
    client: attendee.client,
    event: attendee.event,
    type: 'display',
    destination_url: 'https://wesite1.com/file.pdf',
    presign: false,
    mime_type: 'application/pdf',
    disable_downloads: true,
  };

  const videoRedirect = {
    id: 'videoRedirectId',
    client: attendee.client,
    event: attendee.event,
    type: 'display',
    destination_url: 'https://wesite1.com/my-video.mp4',
    presign: false,
    mime_type: 'video/mp4',
    disable_downloads: true,
  };

  const powerpointRedirect = {
    id: 'powerpointRedirectId',
    client: attendee.client,
    event: attendee.event,
    type: 'display',
    destination_url: 'https://wesite1.com/my-presenattion.ppt',
    presign: false,
    mime_type: 'application/vnd.ms-powerpoint',
    disable_downloads: false,
  };

  const imageRedirect = {
    id: 'imageRedirectId',
    client: attendee.client,
    event: attendee.event,
    type: 'display',
    destination_url: 'https://wesite1.com/my-image.jpg',
    presign: false,
    mime_type: 'image/jpeg',
    disable_downloads: false,
  };

  const kitchenNavigationRedirect = {
    id: 'kitchenNavigationRedirectId',
    client: attendee.client,
    event: attendee.event,
    type: 'navigation',
    destination_url: 'kitchen', // destination_url should store room id
  };

  let database;
  let storage;

  before((done) => {
    database = redisMock.createClient();
    storage = createStorage({ database });
    storage.storeRedirect(redirect);
    storage.storeRedirect(newPageRedirect);
    storage.storeRedirect(pdfRedirect);
    storage.storeRedirect(videoRedirect);
    storage.storeRedirect(powerpointRedirect);
    storage.storeRedirect(imageRedirect);
    storage.storeRedirect(kitchenNavigationRedirect);
    // store system default configuration
    storage.storeSystemConfiguration({ name: 'login_background', value: systemLoginBackground });
    storage.storeSystemConfiguration({ name: 'login_logo', value: systemLoginLogo });
    storage.storeSystemConfiguration({ name: 'login_prompt', value: systemLoginPrompt });
    storage.storeSystemConfiguration({ name: 'default_redirect', value: systemDefaultRedirect });
    const s3 = AWSMock.S3({
      params: { Bucket: 'contents' },
    });

    s3.putObject({ Key: systemLoginBackground, Body: 'content' }, () => {
      s3.putObject({ Key: systemLoginLogo, Body: 'content' }, () => {
        done();
      });
    });
  });

  after(() => {
    database.flushall();
  });

  describe('not logged in', () => {
    context('hotspots', () => {
      it('does not allow ', (done) => {
        request(app)
          .get(sourcePath)
          .expect(401, done);
      });
    });
    context('when visiting :client/:event/login', () => {
      context('when event specific login background, login logo and login prompt were not configured', () => {
        it('should display login background, login logo and login prompt from system config', (done) => {
          request(app)
            .get(`/${client}/${event}/login`)
            .expect((res) => {
              assert.strictEqual(true, res.text.includes(systemLoginLogo));
              assert.strictEqual(true, res.text.includes(systemLoginPrompt));
            })
            .expect(200, done);
        });
      });
    });
    context('pass through', () => {
      it('does not allow ', (done) => {
        request(app)
          .get(eventRoot)
          .expect(302, done);
      });
      it('redirects to login', (done) => {
        request(app)
          .get(eventRoot)
          .expect('Location', `${eventRoot}/login`, done);
      });
    });
    context('attendees', () => {
      it('does not allow ', (done) => {
        request(app)
          .get(`${eventRoot}/attendees`)
          .expect(302, done);
      });
      it('redirects to login', (done) => {
        request(app)
          .get(`${eventRoot}/attendees`)
          .expect('Location', `${eventRoot}/login`, done);
      });
    });
    context('when visits path that does not have event', () => {
      it('redirects to default redirect path', (done) => {
        request(app)
          .get('/random')
          .expect('Location', systemDefaultRedirect)
          .expect(302, done);
      });
    });
  });

  describe('logging in', () => {
    before(() => {
      storage.storeAttendee(attendee);
      storage.storeAttendee(attendee2);
    });
    describe('when user name is provided in uppercase', () => {
      it('treats username as case insensitive and allows login by redirecting to event base', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email.toUpperCase(), password })
          .expect('Location', eventRoot)
          .expect(302, done);
      });
    });
    describe('and event has not started', () => {
      before(() => {
        storage.storeEventConfiguration({ client, event, eventKey: 'start_time', eventValue: tomorrow });
        storage.storeEventConfiguration({ client, event, eventKey: 'end_time', eventValue: (tomorrow + solarDay) });
      });
      it('renders event has not started page', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email, password })
          .expect(200, done);
      });
    });
    describe('and event has ended', () => {
      before(() => {
        storage.storeEventConfiguration({ client, event, eventKey: 'start_time', eventValue: (yesterday - solarDay) });
        storage.storeEventConfiguration({ client, event, eventKey: 'end_time', eventValue: yesterday });
      });
      it('renders event has finished page', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email, password })
          .expect(200, done);
      });
    });
    describe('and event is live', () => {
      before(() => {
        storage.storeAttendee(attendee);
        storage.storeEventConfiguration({ client, event, eventKey: 'start_time', eventValue: yesterday });
        storage.storeEventConfiguration({ client, event, eventKey: 'end_time', eventValue: tomorrow });
      });
      it('redirect to experience', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email, password })
          .expect('Location', eventRoot)
          .expect(302, done);
      });

      it('redirect to login on failure', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: attendee.email, password: 'not the right password' })
          .expect('Location', `${eventRoot}/login`)
          .expect(302, done);
      });

      it('redirect to login on user not found', (done) => {
        request(app)
          .post(`${eventRoot}/login`)
          .type('form')
          .send({ username: 'who@what.where', password: 'not the right password' })
          .expect('Location', `${eventRoot}/login`)
          .expect(302, done);
      });
    });
  });

  describe('logged in', () => {
    let agent;

    before((done) => {
      storage.storeEventConfiguration({ client, event, eventKey: 'start_time', eventValue: yesterday });
      storage.storeEventConfiguration({ client, event, eventKey: 'end_time', eventValue: tomorrow });
      agent = request.agent(app);
      agent
        .post(`${eventRoot}/login`)
        .send({ username: attendee.email, password })
        .end(done);
    });

    context('when visiting :client/:event/login', () => {
      it('redirect to event root', (done) => {
        agent
          .get(`${eventRoot}/login`)
          .expect('Location', eventRoot)
          .expect(302, done);
      });
    });

    context('when visiting different :client/:event/login', () => {
      const otherEventRoot = '/other/event';

      it('logs out user and redirects to login', (done) => {
        agent
          .get(`${otherEventRoot}/login`)
          .expect((res) => {
            assert.match(res.text, new RegExp(systemLoginLogo));
            assert.match(res.text, new RegExp(systemLoginPrompt));
          })
          .expect(200, done);
      });
    });

    context('when visits path that does not have event', () => {
      it('should redirect to event base path', (done) => {
        agent
          .get('/random')
          .expect('Location', eventRoot)
          .expect(302, done);
      });
    });

    context('attendees', () => {
      const attendeesUrl = `${eventRoot}/attendees`;
      it('shows logged in attendees', (done) => {
        agent
          .get(attendeesUrl)
          .expect((res) => {
            assert.strictEqual(true, res.text.includes('Pedro Pepito'));
          })
          .expect((res) => {
            assert.strictEqual(false, res.text.includes('User 2'));
          })
          .expect(200, done);
      });
    });

    context('chat', () => {
      const chatUrl = `${eventRoot}/chat`;
      it('shows UI to chat using Pubsub', (done) => {
        agent
          .get(chatUrl)
          .expect((res) => {
            assert.strictEqual(true, res.text.includes('https://cdn.pubnub.com/sdk/javascript/pubnub.4.32.1.js'));
          })
          .expect(200, done);
      });
    });

    context('hotspots', () => {
      context('when hotspot has presign set true', () => {
        context('and redirect type is new_page', () => {
          before((done) => {
            storage.storeRedirect(preSignRedirectNewPage);
            const s3 = AWSMock.S3({
              params: { Bucket: 'contents' },
            });

            s3.putObject({ Key: preSignRedirectNewPage.destination_url, Body: 'content' }, () => {
              done();
            });
          });
          it('generates presigned url and redirect given link', (done) => {
            agent
              .get(`/hotspots/${preSignRedirectNewPage.id}`)
              .expect(200, done);
          });
        });
        context('and redirect type is not set(default value)', () => {
          before((done) => {
            storage.storeRedirect(preSignRedirect);
            const s3 = AWSMock.S3({
              params: { Bucket: 'contents' },
            });

            s3.putObject({ Key: preSignRedirect.destination_url, Body: 'content' }, () => {
              done();
            });
          });

          it('generates presigned url and redirect to given link', (done) => {
            agent
              .get(`/hotspots/${presignHotSpotId}`)
              .expect(302, done);
          });
        });
      });
      context('when hotspot has presigned set falsy value', () => {
        it('redirects to hotspot path', (done) => {
          agent
            .get(sourcePath)
            .expect('Location', destinationUrl)
            .expect(302, done);
        });

        it('redirects to hotspot path when parameters are present', (done) => {
          agent
            .get(`${sourcePath}?v=123`)
            .expect('Location', destinationUrl)
            .expect(302, done);
        });

        it('renders an html page with destination_url when hotspot redirect type is new_page', (done) => {
          const response = `<a href="${newPageRedirect.destination_url}" target="_blank">${newPageRedirect.destination_url}</a>`;
          agent
            .get(`${sourcePath}/new_page_hotspot`)
            .expect((res) => {
              assert.strictEqual(true, res.text.includes(response));
            })
            .expect(200, done);
        });

        it('returns 404', (done) => {
          agent
            .get('/hotspots/notfound')
            .expect(404, done);
        });
      });
      context('when hotspot has redirect type as display', () => {
        context('and mime_type is application/pdf', () => {
          it('renders pdf', (done) => {
            agent
              .get(`${sourcePath}/${pdfRedirect.id}`)
              .expect((res) => {
                // Pdf should be rendered using pdf.js
                assert.strictEqual(true, res.text.includes('/pdfjs/web/viewer.html?file='));
              })
              .expect(200, done);
          });
        });
        context('and mime_type type is video', () => {
          it('renders video player', (done) => {
            agent
              .get(`${sourcePath}/${videoRedirect.id}`)
              .expect((res) => {
                // should use video.js to
                assert.strictEqual(true, res.text.includes('https://vjs.zencdn.net/7.11.4/video-js.css'));
              })
              .expect(200, done);
          });
        });
        context('and mime_type is PowerPoint', () => {
          it('renders PowerPoint with Google view', (done) => {
            agent
              .get(`${sourcePath}/${powerpointRedirect.id}`)
              .expect((res) => {
                assert.strictEqual(true, res.text.includes('https://docs.google.com/gview?url'));
              })
              .expect(200, done);
          });
        });
        context('and mime_type is Image', () => {
          it('renders Image', (done) => {
            agent
              .get(`${sourcePath}/${imageRedirect.id}`)
              .expect((res) => {
                assert.strictEqual(true, res.text.includes(imageRedirect.destination_url));
              })
              .expect(200, done);
          });
        });
      });
      context('when hotspot has redirect type as navigation', () => {
        it('redirects to room', (done) => {
          agent
            .get(`${sourcePath}/${kitchenNavigationRedirect.id}`)
            .expect('Location', `${eventRoot}/${kitchenNavigationRedirect.destination_url}/index.htm`)
            .expect(302, done);
        });
      });
    });

    context('pass through', () => {
      context('list attendees in room', () => {
        const roomName = 'room1';
        it('should list attendees visiting a room', (done) => {
          agent
            .get(`${eventRoot}/${roomName}/attendees`)
            .expect((res) => {
              assert.strictEqual(true, res.text.includes(attendee.name));
            })
            .expect(200, done);
        });
      });

      context('room path', () => {
        const room = 'welcomecenter';
        const filename = 'video.mp4';
        const fileKey = `${room}/${filename}`;
        const contentPath = `${room}/media/${filename}`;
        const experienceBucketContent = 'This is experience Bucket';

        context('when environmental config was not set for path', () => {
          let s3;
          before((done) => {
            s3 = AWSMock.S3({
              params: { Bucket: 'experiences' },
            });

            s3.putObject({ Key: contentPath, Body: experienceBucketContent }, () => {
              done();
            });
          });

          it('returns file from experience bucket', (done) => {
            agent
              .get(`${eventRoot}/${contentPath}`)
              .expect((res) => {
                assert.strictEqual(res.text, experienceBucketContent);
              })
              .expect(200, done);
          });
        });

        context('when environmental config was set for path', () => {
          const replacementFilename = 'othervideo.mp4';
          const fileContent = 'This is content Bucket';

          let s3;
          before((done) => {
            storage.storeEnvironmentalConfiguration({ client, event, key: fileKey, value: replacementFilename });
            s3 = AWSMock.S3({
              params: { Bucket: 'contents' },
            });

            s3.putObject({ Key: replacementFilename, Body: fileContent }, () => {
              done();
            });
          });
          it('returns file from content bucket', (done) => {
            agent
              .get(`${eventRoot}/${contentPath}`)
              .expect((res) => {
                assert.strictEqual(res.text, fileContent);
              })
              .expect(200, done);
          });
        });
      });

      context('other paths', () => {
        const content = '<html><body>Hello</body></html>';
        let s3;

        before((done) => {
          s3 = AWSMock.S3({
            params: { Bucket: 'experiences' },
          });

          s3.putObject({ Key: 'something/else/something.html', Body: content }, () => {
            done();
          });
        });

        it('returns the file', (done) => {
          agent
            .get(`${eventRoot}/something/else/something.html`)
            .expect((res) => {
              assert.strictEqual(res.text, content);
            })
            .expect(200, done);
        });
      });
    });

    context('pass through main entrance', () => {
      const eventKey = 'main_entrance';
      const eventValue = 'experience1';

      before((done) => {
        storage.storeEventConfiguration({ client, event, eventKey, eventValue });
        done();
      });

      it('redirects to default room', (done) => {
        agent
          .get(`${eventRoot}`)
          .expect('Location', `${eventRoot}/${eventValue}/index.htm`)
          .expect(302, done);
      });
    });
  });

  describe('logging out', () => {
    context('when visiting :client/:event/logout', () => {
      let agent;
      before((done) => {
        agent = request.agent(app);
        agent
          .post(`${eventRoot}/login`)
          .send({ username: attendee.email, password })
          .end(done);
      });
      it('it destroys user session and redirects to event login', (done) => {
        agent
          .get(`${eventRoot}/logout`)
          .expect('Location', `${eventRoot}/login`)
          .expect(302, done);
      });
    });
  });
});
