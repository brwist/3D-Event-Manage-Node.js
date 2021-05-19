const AWS = require('aws-sdk');
const { contentBucket } = require('../../configs/aws');

const awsConfig = contentBucket.awsConfig
AWS.config.update({...awsConfig});

module.exports = new AWS.S3();
