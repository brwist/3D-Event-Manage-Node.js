const AWS = require('aws-sdk');
const { experienceBucket } = require('../../configs/aws');

const awsConfig = experienceBucket.awsConfig;
AWS.config.update({...awsConfig});

module.exports = new AWS.S3();
