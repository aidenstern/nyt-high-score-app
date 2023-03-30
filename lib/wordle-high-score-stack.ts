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

    // DynamoDB table to store OTPs
    const otpTable = new dynamodb.Table(this, "OTPTable", {
      partitionKey: {
        name: "phoneNumberHash",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
    });

    // Lambda function handlers
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

    const otpHandler = new lambda.NodejsFunction(this, "OTPHandler", {
      entry: "lib/otp.handler.ts",
      environment: {
        TWILIO_SECRET_ARN: twilioSecret.secretArn,
        OTP_TABLE_NAME: otpTable.tableName,
      },
    });

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

    const wordleGetScoresHandler = new lambda.NodejsFunction(
      this,
      "WordleGetScoresHandler",
      {
        entry: "lib/wordle-get-scores.handler.ts",
        environment: {
          BUCKET_NAME: gameScoreBucket.bucketName,
        },
      }
    );

    // Permissions for Lambda functions
    gameScoreBucket.grantRead(wordleGetScoresHandler);
    gameScoreBucket.grantReadWrite(wordleScoreHandler);
    twilioSecret.grantRead(wordleScoreHandler);
    twilioSecret.grantRead(otpHandler);
    otpTable.grantReadWriteData(otpHandler);
    otpTable.grantReadWriteData(authorizerHandler);

    // API Gateway resources
    const api = new apigateway.RestApi(this, "GameScoreApi");
    const smsResource = api.root.addResource("sms");
    const smsIntegration = new apigateway.LambdaIntegration(
      wordleScoreHandler,
      {
        proxy: true,
      }
    );
    smsResource.addMethod("POST", smsIntegration);

    const otpApi = new apigateway.RestApi(this, "OTPEndpoint");
    const otpResource = otpApi.root.addResource("otp");
    const otpIntegration = new apigateway.LambdaIntegration(otpHandler, {
      proxy: true,
    });
    otpResource.addMethod("POST", otpIntegration);

    const scoresApi = new apigateway.RestApi(this, "WordleScoresApi");
    const scoresResource = scoresApi.root.addResource("scores");
    const scoresPostIntegration = new apigateway.LambdaIntegration(
      wordleScoreHandler
    );
    const scoresGetIntegration = new apigateway.LambdaIntegration(
      wordleGetScoresHandler
    );
    const authorizer = new apigateway.TokenAuthorizer(this, "Authorizer", {
      handler: authorizerHandler,
    });
    scoresResource.addMethod("POST", scoresPostIntegration, { authorizer });
    scoresResource.addMethod("GET", scoresGetIntegration, { authorizer });    
  }
}
