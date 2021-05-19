module.exports = {
  experienceBucket: {
    awsConfig: {
      accessKeyId: process.env.EXPERIENCE_ACCESS_KEY_ID,
      secretAccessKey: process.env.EXPERIENCE_SECRET_ACCESS_KEY,
    },
    bucket: process.env.EXPERIENCE_BUCKET || 'experiences',
  },
  contentBucket: {
    awsConfig: {
      accessKeyId: process.env.CONTENT_ACCESS_KEY_ID,
      secretAccessKey: process.env.CONTENT_SECRET_ACCESS_KEY,
    },
    bucket: process.env.CONTENT_BUCKET || 'contents',
  }
}
