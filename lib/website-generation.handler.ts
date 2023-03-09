import { S3Client, ListObjectsCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';

import template from "./website";

const s3 = new S3Client({});

const gameScoreBucketName = process.env.GAME_SCORE_BUCKET_NAME;
const websiteBucketName = process.env.WEBSITE_BUCKET_NAME;

export const handler: Handler = async (event, context) => {
  const bucketName = process.env.BUCKET_NAME;

  // Get list of scores

  // Get three highest scores

  // Create a static page with these scores from template

  // Upload page to S3 bucket


  // Invalidate object cache for CloudFront
}