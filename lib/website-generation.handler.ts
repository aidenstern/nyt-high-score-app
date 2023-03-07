import { S3Client, ListObjectsCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';

const s3 = new S3Client({});

const gameScoreBucketName = process.env.GAME_SCORE_BUCKET_NAME;
const websiteBucketName = process.env.WEBSITE_BUCKET_NAME;

export const handler: Handler = async (event, context) => {
  const bucketName = process.env.BUCKET_NAME;

  // Get list of scores
  
  // Get three highest scores

  // Create an 11ty page with these scores

  // Upload page to S3 bucket

  // Invalidate object cache for CloudFront
}