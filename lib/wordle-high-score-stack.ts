import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class WordleHighScoreStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for games scores
    const gameScoreBucket = new s3.Bucket(this, "GameScoreBucket", {
      versioned: true,
    });

    // Twilio secrets
    const twilioSecret = new secretsmanager.Secret(this, "TwilioSecrets", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          ACCOUNT_SID: "",
          PHONE_NUMBER: "",
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

    // API Gateway for Twilio webhook
    const api = new apigateway.RestApi(this, "GameScoreApi");
    const smsResource = api.root.addResource("sms");
    const smsIntegration = new apigateway.LambdaIntegration(
      wordleScoreHandler,
      {
        proxy: true,
      }
    );

    // DynamoDB table to store OTPs
    const otpTable = new dynamodb.Table(this, "OTPTable", {
      partitionKey: {
        name: "phoneNumberHash",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
    });


    // OTP Lambda handler
    const otpHandler = new lambda.NodejsFunction(this, "OTPHandler", {
      entry: "lib/otp.handler.ts",
      environment: {
        TWILIO_SECRET_ARN: twilioSecret.secretArn,
        OTP_TABLE_NAME: otpTable.tableName,
      },
    });

    // Grant permissions to access Twilio secrets
    twilioSecret.grantRead(otpHandler);

    // Grant permissions to access the OTP table
    otpTable.grantReadWriteData(otpHandler);

    // Authorizer Lambda handler
    const authorizerHandler = new lambda.NodejsFunction(
      this,
      "AuthorizerHandler",
      { 
        entry: "lib/authorizer.handler.ts",
        environment: {
          OTP_TABLE_NAME: otpTable.tableName,
        },
      }
    );

    // Grant permissions to access the OTP table
    otpTable.grantReadWriteData(authorizerHandler);

    // API Gateway for the OTP endpoint
    const otpApi = new apigateway.RestApi(this, "OTPEndpoint");
    const otpResource = otpApi.root.addResource("otp");
    const otpIntegration = new apigateway.LambdaIntegration(otpHandler);
    otpResource.addMethod("POST", otpIntegration);

    // API Gateway for Wordle scores endpoint with authorizer
    const scoresApi = new apigateway.RestApi(this, "WordleScoresApi");
    const scoresResource = scoresApi.root.addResource("scores");
    const scoresIntegration = new apigateway.LambdaIntegration(
      wordleScoreHandler
    );
    const authorizer = new apigateway.TokenAuthorizer(this, "Authorizer", {
      handler: authorizerHandler,
    });
    scoresResource.addMethod("GET", scoresIntegration, { authorizer });

    smsResource.addMethod("POST", smsIntegration);
  }
}
