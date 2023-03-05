import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export class WordleHighScoreStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for games scores
    const bucket = new s3.Bucket(this, "GameScoreBucket", {
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
    const wordleHighScoreHandler = new lambda.NodejsFunction(
      this,
      "HighScoreHandler",
      {
        entry: "lib/wordle-high-score.handler.ts",
        environment: {
          BUCKET_NAME: bucket.bucketName,
          TWILIO_SECRET_ARN: twilioSecret.secretArn
        },
      }
    );

    bucket.grantReadWrite(wordleHighScoreHandler);
    twilioSecret.grantRead(wordleHighScoreHandler)
    // bucket.grantRead(dailyScoreReportHandler);

    // API Gateway for Twilio webhook
    const api = new apigateway.RestApi(this, "GameScoreApi");
    const smsResource = api.root.addResource("sms");
    const smsIntegration = new apigateway.LambdaIntegration(
      wordleHighScoreHandler
    );
    smsResource.addMethod("POST", smsIntegration);
  }
}
