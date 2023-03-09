import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as lambdaevents from "aws-cdk-lib/aws-lambda-event-sources";

export class WordleHighScoreStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for games scores
    const gameScoreBucket = new s3.Bucket(this, "GameScoreBucket", {
      versioned: true,
    });

    // Event that fires when game score bucket is updated
    const gameBucketEventSource = new lambdaevents.S3EventSource(
      gameScoreBucket,
      {
        events: [s3.EventType.OBJECT_CREATED_PUT],
      }
    );

    // S3 bucket for website
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      versioned: true,
    });

    // Twilio secrets
    const twilioSecret = new secretsmanager.Secret(this, "TwilioSecrets", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          ACCOUNT_SID: "",
        }),
        generateStringKey: "AUTH_TOKEN",
      },
    });

    // Lambda function handler for storing Wordle scores in S3
    const wordleScoreHandler = new lambda.NodejsFunction(
      this,
      "WordleScoreHandler",
      {
        entry: "lib/wordle-score.handler.ts",
        environment: {
          BUCKET_NAME: gameScoreBucket.bucketName,
          TWILIO_SECRET_ARN: twilioSecret.secretArn,
        },
      }
    );

    // Permissions for wordle score handler
    gameScoreBucket.grantReadWrite(wordleScoreHandler);
    twilioSecret.grantRead(wordleScoreHandler);

    // Lambda function handler for generating website
    const websiteGenerationHandler = new lambda.NodejsFunction(
      this,
      "WebsiteGenerationHandler",
      {
        entry: "lib/website-generation.handler.ts",
        environment: {
          GAME_SCORE_BUCKET_NAME: gameScoreBucket.bucketName,
          WEBSITE_BUCKET_NAME: websiteBucket.bucketName,
        },
      }
    );

    // Trigger lambda when game bucket is updated
    websiteGenerationHandler.addEventSource(gameBucketEventSource);

    // Permissions for website generation lambda
    gameScoreBucket.grantRead(websiteGenerationHandler);
    websiteBucket.grantWrite(websiteGenerationHandler);

    // API Gateway for Twilio webhook
    const api = new apigateway.RestApi(this, "GameScoreApi");
    const smsResource = api.root.addResource("sms");
    const smsIntegration = new apigateway.LambdaIntegration(
      wordleScoreHandler
    );
    smsResource.addMethod("POST", smsIntegration);
  }
}
