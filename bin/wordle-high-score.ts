#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WordleHighScoreStack } from "../lib/wordle-high-score-stack";

const app = new cdk.App();
new WordleHighScoreStack(app, "WordleHighScoreStack", {
  env: { account: "407895279156", region: "us-west-1" },
});
