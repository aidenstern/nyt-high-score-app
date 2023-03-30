import { APIGatewayTokenAuthorizerHandler } from "aws-lambda";
import { verifyOTP } from "./otp";

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  const authToken = event.authorizationToken;

  if (!authToken) {
    return {
      principalId: "anonymous",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: event.methodArn,
          },
        ],
      },
    };
  }

  const [phoneNumber, otp] = authToken.split(":");

  if (await verifyOTP(phoneNumber, otp)) {
    return generatePolicy("user", "Allow", event.methodArn);
  } else {
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

function generatePolicy(principalId: string, effect: string, resource: string) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
