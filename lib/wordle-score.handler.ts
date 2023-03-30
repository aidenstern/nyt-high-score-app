import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Handler } from "aws-lambda";
import { WordleGame, parseWordleMessage, isValidWordleMessage } from "./wordle";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import twilio = require("twilio");
import { createHash } from "crypto";

const s3 = new S3Client({});
const secretsManager = new SecretsManagerClient({});

const bucketName = process.env.BUCKET_NAME;
const twilioSecretArn = process.env.TWILIO_SECRET_ARN;

function hashPhoneNumber(phoneNumber: string): string {
  return createHash("sha256").update(phoneNumber).digest("hex");
}

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

    const message = params.Body; // Wordle message
    if (!isValidWordleMessage(message)) {
      throw new Error("Invalid Wordle message");
    }

    // Put wordle game object into S3 
    const phoneNumber = hashPhoneNumber(params.From);
    const wordleGame: WordleGame = parseWordleMessage(message);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `wordle/${phoneNumber}/${wordleGame.number}.json`,
        Body: JSON.stringify(wordleGame),
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: "Wordle score saved successfully",
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "Error saving Wordle score",
    };
  }
}    