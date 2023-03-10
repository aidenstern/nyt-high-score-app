# Wordle High Score App

## Getting started

### Deployment
Download AWS CLI, create an IAM user in your account with Lambda and CloudFormation full access policies, and use `aws configure` with the IAM user's access key.

* `cdk deploy`      deploy this stack to your AWS account
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


### Development

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests