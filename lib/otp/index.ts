import { PutCommand, DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { randomBytes } from "crypto";
import { TextEncoder } from "util";
import twilio = require("twilio");
import * as crypto from 'crypto';

// Set up the DynamoDB client
const client = new DynamoDBClient({ region: 'us-east-1' });
const ddbDocClient = DynamoDBDocument.from(client);

// Set up the Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const generateOTP = async (): Promise<string> => {
  const otp = (Math.floor(Math.random() * 1000000) + 1000000).toString().substring(1);
  return otp;
};

export const storeOTP = async (
  phoneNumber: string,
  otp: string,
  ttl: number = 300
) => {
  const params = {
    TableName: process.env.OTP_TABLE_NAME!,
    Item: {
      phoneNumber,
      otp,
      expires: Math.floor(Date.now() / 1000) + ttl,
    },
  };

  await ddbDocClient.send(new PutCommand(params)).catch((error) => {
    console.error('Error storing OTP:', error);
  });
};

export const verifyOTP = async (phoneNumber: string, otp: string): Promise<boolean> => {
  // Replace with your implementation to verify the OTP
  // (e.g., retrieve the stored OTP from the DynamoDB table and compare it with the received OTP)
  return true;
};

export const hashPhoneNumber = (phoneNumber: string): string => {
  const encoder = new TextEncoder();
  const data = encoder.encode(phoneNumber);
  const digest = randomBytes(32);
  return digest.toString("hex");
};

export const sendOTP = async (phoneNumber: string, otp: string): Promise<void> => {
  await twilioClient.messages.create({
    body: `Your Wordle OTP is ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
};
