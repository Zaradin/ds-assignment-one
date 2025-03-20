import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { movies } from "../seed/movies";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class DsAssignmentOneStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Tables
        const moviesTable = new dynamodb.Table(this, "MoviesTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Movies",
        });

        // Table seeding
        new custom.AwsCustomResource(this, "moviesddbInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [moviesTable.tableName]: generateBatch(movies),
                    },
                },
                physicalResourceId:
                    custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [moviesTable.tableArn],
            }),
        });

        // Lambdas Functions

        const getMovieByIdFn = new lambdanode.NodejsFunction(
            this,
            "GetMovieByIdFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/getMovieById.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: moviesTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const addnewMovieFn = new lambdanode.NodejsFunction(
            this,
            "Add New Movie Fn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_22_X,
                entry: `${__dirname}/../lambdas/addMovie.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: moviesTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const getAllMoviesFn = new lambdanode.NodejsFunction(
            this,
            "GetAllMoviesFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/getAllMovies.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: moviesTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        // Permissions
        moviesTable.grantReadData(getMovieByIdFn);
        moviesTable.grantReadWriteData(addnewMovieFn);
        moviesTable.grantReadData(getAllMoviesFn);

        // REST API Implementation
        const api = new apig.RestApi(this, "RestAPI", {
            description: "Movies App API",
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
        const apiKey = new apig.ApiKey(this, "MoviesAPIKey", {
            apiKeyName: "Movies-API-Key",
            description: "API Key for Movies API",
        });

        // Create a usage plan
        const usagePlan = new apig.UsagePlan(this, "MoviesAPIUsagePlan", {
            name: "Movies API Usage Plan",
            apiStages: [
                {
                    api: api,
                    stage: api.deploymentStage,
                },
            ],
        });

        // HERE -> I Add the API key to the usage plan that I created above
        usagePlan.addApiKey(apiKey);

        // ENDPOINTS

        // Top level endpoint
        const moviesEndpoint = api.root.addResource("movies");

        // Params
        const MovieEndpoint = moviesEndpoint.addResource("{movieId}");
        MovieEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
        );

        moviesEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getAllMoviesFn, { proxy: true })
        );

        // This POST endpoint needs to use the API key
        moviesEndpoint.addMethod(
            "POST",
            new apig.LambdaIntegration(addnewMovieFn, { proxy: true }),
            {
                apiKeyRequired: true,
            }
        );

        // Add output for the API Gateway URL | it already gets outputed but could manually print different endpoints in the future
        // new cdk.CfnOutput(this, "API Gateway URLs", {
        //     value: api.url,
        // });
    }
}
