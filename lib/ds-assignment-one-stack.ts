import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { patients } from "../seed/patients";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class DsAssignmentOneStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Tables
        const patientsTable = new dynamodb.Table(this, "PatientsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Patients",
        });

        // Translations Table to persisit translations
        const translationsTable = new dynamodb.Table(
            this,
            "TranslationsTable",
            {
                billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
                partitionKey: {
                    name: "id",
                    type: dynamodb.AttributeType.STRING,
                },
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                tableName: "Translations",
            }
        );

        // Table seeding using the patients seeding file
        new custom.AwsCustomResource(this, "patientsddbInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [patientsTable.tableName]: generateBatch(patients),
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of(
                    "patientsddbInitData"
                ),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [patientsTable.tableArn],
            }),
        });

        // Lambda Functions
        const getPatientByIdFn = new lambdanode.NodejsFunction(
            this,
            "GetPatientByIdFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/getPatientById.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const addNewPatientFn = new lambdanode.NodejsFunction(
            this,
            "AddNewPatientFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_22_X,
                entry: `${__dirname}/../lambdas/addPatient.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const getAllPatientsFn = new lambdanode.NodejsFunction(
            this,
            "GetAllPatientsFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/getAllPatients.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const updatePatientFn = new lambdanode.NodejsFunction(
            this,
            "UpdatePatientFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/updatePatient.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const translateDiagnosisFn = new lambdanode.NodejsFunction(
            this,
            "TranslateDiagnosisFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/translatePatientDiagnosisDescription.ts`,
                timeout: cdk.Duration.seconds(15),
                memorySize: 128,
                environment: {
                    PATIENTS_TABLE: patientsTable.tableName,
                    TRANSLATIONS_TABLE: translationsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        // Permissions
        patientsTable.grantReadData(getPatientByIdFn);
        patientsTable.grantReadWriteData(addNewPatientFn);
        patientsTable.grantReadData(getAllPatientsFn);
        patientsTable.grantReadWriteData(updatePatientFn);
        patientsTable.grantReadData(translateDiagnosisFn);

        // Grant permissions to the translations table
        translationsTable.grantReadWriteData(translateDiagnosisFn);

        // Grant AWS Translate permissions to the Lambda function
        translateDiagnosisFn.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ["translate:TranslateText"],
                resources: ["*"],
                effect: cdk.aws_iam.Effect.ALLOW,
            })
        );

        // REST API Implementation
        const api = new apig.RestApi(this, "RestAPI", {
            description: "Patient Management API",
            deployOptions: {
                stageName: "dev",
            },
            defaultCorsPreflightOptions: {
                allowHeaders: ["Content-Type", "X-Amz-Date"],
                allowMethods: [
                    "OPTIONS",
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                ],
                allowCredentials: true,
                allowOrigins: ["*"],
            },
        });

        // Create an API key
        const apiKey = new apig.ApiKey(this, "PatientsAPIKey", {
            apiKeyName: "Patients-API-Key",
            description: "API Key for Patient Management API",
        });

        // Create a usage plan
        const usagePlan = new apig.UsagePlan(this, "PatientsAPIUsagePlan", {
            name: "Patient Management API Usage Plan",
            apiStages: [
                {
                    api: api,
                    stage: api.deploymentStage,
                },
            ],
        });

        // Add the API key to the usage plan
        usagePlan.addApiKey(apiKey);

        // ENDPOINTS
        // Top level endpoint
        const patientsEndpoint = api.root.addResource("patients");

        // Params
        const patientEndpoint = patientsEndpoint.addResource("{patientId}");
        patientEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getPatientByIdFn, { proxy: true })
        );

        // Uses the API Gateway Key
        patientEndpoint.addMethod(
            "PUT",
            new apig.LambdaIntegration(updatePatientFn, { proxy: true }),
            {
                apiKeyRequired: true,
            }
        );

        // Add a new resource for translation endpoint (on the higher level patient endpoint)
        const translateEndpoint = patientEndpoint.addResource("translate");
        translateEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(translateDiagnosisFn, { proxy: true })
        );

        patientsEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getAllPatientsFn, { proxy: true })
        );

        // This POST endpoint alsi needs to use the API key
        patientsEndpoint.addMethod(
            "POST",
            new apig.LambdaIntegration(addNewPatientFn, { proxy: true }),
            {
                apiKeyRequired: true,
            }
        );
    }
    // Add output for the API Gateway URL | it already gets outputed but could manually print different endpoints in the future

    // new cdk.CfnOutput(this, "API Gateway URLs", {

    //     value: api.url,

    // });
}
