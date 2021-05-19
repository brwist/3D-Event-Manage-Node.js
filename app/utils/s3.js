async function downloadFromS3(s3Client, bucket, key) {
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
