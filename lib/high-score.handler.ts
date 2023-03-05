import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';

const s3 = new S3Client({ region: 'us-east-1' });

const authToken = process.env.TWILIO_AUTH_TOKEN;
const bucketName = process.env.BUCKET_NAME || '';

import twillio = require('twilio');

export const handler: Handler = async (event, context) => {
  try {
    const twilioSignature = event.headers['x-twilio-signature'];
    const body = event.body || '';

    const validRequest = twillio.validateRequest(
      authToken,
      twilioSignature,
      `${process.env.API_GATEWAY_URL}/sms`,
      body
    );

    if (!validRequest) {
      throw new Error('Invalid request signature');
    }

    const highScore = parseInt(event.body);

    if (isNaN(highScore)) {
      throw new Error('Invalid high score');
    }

    const phoneNumber = event.From.replace(/\D/g, '');

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `${phoneNumber}.txt`,
        Body: highScore.toString(),
      })
    );

    return {
      statusCode: 200,
      body: 'High score saved successfully',
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: 'Error saving high score',
    };
  }
};
