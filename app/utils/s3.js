const AWS = require('aws-sdk');
const {awsConfig, bucket} = require('../configs/aws');

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
