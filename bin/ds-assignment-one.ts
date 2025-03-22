#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DsAssignmentOneStack } from "../lib/ds-assignment-one-stack";
import { DatabaseStack } from "../lib/database-stack";
import { ApiStack } from "../lib/api-stack";

const app = new cdk.App();
// db stack
const dbStack = new DatabaseStack(app, "PatientDatabaseStack", {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: "eu-west-1",
    },
});

// API stack
const apiStack = new ApiStack(app, "PatientApiStack", {
    patientsTable: dbStack.databaseConstruct.patientsTable,
    translationsTable: dbStack.databaseConstruct.translationsTable,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: "eu-west-1",
    },
});

// This is ti ensure the database stack is created first
apiStack.addDependency(dbStack);

// OLD WAY USING 1 STACK IS BELOW

// new DsAssignmentOneStack(app, 'DsAssignmentOneStack', {
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   // env: { account: '123456789012', region: 'us-east-1' },

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
// });
