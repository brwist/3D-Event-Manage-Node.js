const AWS = require('aws-sdk');

const bucket = process.env.EXPERIENCE_BUCKET || 'experiences'
const awsConfig = {
  accessKeyId: process.env.EXPERIENCE_ACCESS_KEY_ID,
  secretAccessKey: process.env.EXPERIENCE_SECRET_ACCESS_KEY,
};

AWS.config.update({...awsConfig});

const s3Client = new AWS.S3();

async function downloadFromS3(key) {
  const config = { Bucket: bucket, Key: key }
  const file = await s3Client.getObject(config).promise()
  return {
   data: file.Body,
   mimetype: file.ContentType
  }
}

module.exports = {
  downloadFromS3
}
