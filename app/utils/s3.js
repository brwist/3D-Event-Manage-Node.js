const AWS = require('aws-sdk');
const { contentBucket } = require('../configs/aws');

const awsConfig = contentBucket.awsConfig
AWS.config.update({...awsConfig});

const s3Client = new AWS.S3();

async function downloadFromS3(s3Client, bucket, key) {
  const config = { Bucket: bucket, Key: key }
  const file = await s3Client.getObject(config).promise()
  return {
   data: file.Body,
   mimetype: file.ContentType
  }
}

function generatePresignedUrl(s3Client, bucket, key, duration) {
  var params = { Bucket: bucket, Key: key, Expires: duration };
  return s3Client.getSignedUrl('getObject', params);
}

function presignedUrlFromContentBucket(key) {
  const bucketName = contentBucket.bucket;
  const duration = 15 * 60; // Signed url expires in 15 minutes
  return generatePresignedUrl(s3Client, bucketName, key, duration);
}

module.exports = {
  downloadFromS3,
  presignedUrlFromContentBucket: presignedUrlFromContentBucket
}
