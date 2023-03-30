import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { generateOTP, storeOTP, hashPhoneNumber, verifyOTP } from "./otp";

const ddb = new DynamoDB({});
const secretsManager = new SecretsManager({});

export const handler: APIGatewayProxyHandler = async (event) => {
  const phoneNumber = event.queryStringParameters?.phoneNumber;

  if (!phoneNumber) {
    return {
      statusCode: 400,
      body: "Missing phoneNumber query parameter",
    };
  }

  const hashedPhoneNumber = hashPhoneNumber(phoneNumber);

  if (event.httpMethod === "GET") {
    const otp = await generateOTP();
    const twilioSecret = await secretsManager.getSecretValue({
      SecretId: process.env.TWILIO_SECRET_ARN!,
    });
    const { ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER } = JSON.parse(
      twilioSecret.SecretString || "{}"
    );

    const twilio = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

    await twilio.messages.create({
      body: `Your Wordle OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    await storeOTP(hashedPhoneNumber, otp);

    return {
      statusCode: 200,
      body: "OTP sent successfully",
    };
  } else if (event.httpMethod === "POST") {
    const otp = event.queryStringParameters?.otp;

    if (!otp) {
      return {
        statusCode: 400,
        body: "Missing OTP query parameter",
      };
    }

    if (await verifyOTP(hashedPhoneNumber, otp)) {
      return {
        statusCode: 200,
        body: "OTP verified successfully",
      };
    } else {
      return {
        statusCode: 401,
        body: "Incorrect OTP",
      };
    }
  } else {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }
};
