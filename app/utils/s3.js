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

module.exports = {
  downloadFromS3,
  generatePresignedUrl
}
