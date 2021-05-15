module.exports = {
  awsConfig: {
    accessKeyId: process.env.EXPERIENCE_ACCESS_KEY_ID,
    secretAccessKey: process.env.EXPERIENCE_SECRET_ACCESS_KEY,
  },
  bucket: process.env.EXPERIENCE_BUCKET || 'experiences'
}
