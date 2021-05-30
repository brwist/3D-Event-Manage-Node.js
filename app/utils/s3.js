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

async function generatePresignedUrl(s3Client, bucket, key, duration) {
  return new Promise((resolve, reject) => {
    var params = { Bucket: bucket, Key: key, Expires: duration };

    s3Client.getSignedUrl('getObject', params, (err, url) => { resolve(url) });
  });
}

async function presignedUrlFromContentBucket(key) {
  const bucketName = contentBucket.bucket;
  const duration = 15 * 60; // Signed url expires in 15 minutes
  return await generatePresignedUrl(s3Client, bucketName, key, duration);
}

module.exports = {
  downloadFromS3,
  presignedUrlFromContentBucket
}
