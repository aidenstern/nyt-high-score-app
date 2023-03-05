import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class WordleHighScoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Step 1: Create an S3 bucket
    const bucket = new s3.Bucket(this, 'HighScoresBucket', {
      versioned: true,
    });

    // Step 2: Create a Lambda function
    const highScoreHandler = new lambda.NodejsFunction(this, 'HighScoreHandler', {
      environment: {
        BUCKET_NAME: bucket.bucketName,
        AUTH_TOKEN: ""
      },
    });

    bucket.grantReadWrite(highScoreHandler);

    // Step 3: Create an API Gateway REST API
    const api = new apigateway.RestApi(this, 'HighScoreApi');

    const smsResource = api.root.addResource('sms');
    const smsIntegration = new apigateway.LambdaIntegration(highScoreHandler);
    smsResource.addMethod('POST', smsIntegration);
  }
}