import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Handler } from "aws-lambda";
import { getWordleScore, getWordleNumber } from "./wordle";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import twilio = require("twilio");

const s3 = new S3Client({});
const secretsManager = new SecretsManagerClient({});

const bucketName = process.env.BUCKET_NAME;
const twilioSecretArn = process.env.TWILIO_SECRET_ARN;

export const handler: Handler = async (event, context) => {
  try {
    console.log(event, context);

    const twilioSecret = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: twilioSecretArn,
      })
    );

    if (twilioSecret.SecretString == undefined) {
      throw new Error("Failed to retrieve Twilio secret");
    }

    const twilioAuthToken = JSON.parse(twilioSecret.SecretString).AUTH_TOKEN;
    const twilioSignature = event.headers["X-Twilio-Signature"];
    const apiUrl = `https://${event.requestContext.domainName}${event.requestContext.path}`;
    const params = Object.fromEntries(new URLSearchParams(event.body));

    const validRequest = twilio.validateRequest(
      twilioAuthToken,
      twilioSignature,
      apiUrl,
      params
    );

    if (!validRequest) {
      throw new Error("Invalid Twilio request signature");
    }

    const phoneNumber = params.From;
    const message = params.Body; // Wordle message
    const wordleNumber = getWordleNumber(message);
    const wordleScore = getWordleScore(message);

    console.log({
      params, message, phoneNumber, wordleNumber, wordleScore
    });

    if (isNaN(wordleScore) || wordleNumber == undefined) {
      throw new Error("Invalid Wordle message");
    }

    const object = await s3.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: `wordle/${wordleNumber}.json`
    }));

    let scores = [];
    let newScore = {
      phoneNumber,
      wordleScore,
      message
    };

    // If we don't have existing entries for this Wordle
    if (object.Body == undefined) {
      scores.push(newScore);
    // Otherwise add score to list of entries and sort it
    } else {
      scores = JSON.parse(await object.Body.transformToString('utf-8'));
      scores.push(newScore);
      scores.sort((a: any, b: any) => {
        return a.wordleScore - b.wordleScore;
      })
    }
    
    // Put updated score array into S3 
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `wordle/${wordleNumber}/${phoneNumber}.json`,
        Body: JSON.stringify(scores),
      })
    );

    return {
      statusCode: 200,
      body: "Wordle score saved successfully",
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: "Error saving Wordle score",
    };
  }
};
