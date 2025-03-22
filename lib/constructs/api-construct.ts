import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";

// Define interface for construct properties
export interface ApiGatewayConstructProps {
    getPatientByIdFn: lambdanode.NodejsFunction;
    addNewPatientFn: lambdanode.NodejsFunction;
    getAllPatientsFn: lambdanode.NodejsFunction;
    updatePatientFn: lambdanode.NodejsFunction;
    translateDiagnosisFn: lambdanode.NodejsFunction;
}

export class ApiGatewayConstruct extends Construct {
    public readonly api: apig.RestApi;
    public readonly apiKey: apig.ApiKey;

    constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
        super(scope, id);

        const {
            getPatientByIdFn,
            addNewPatientFn,
            getAllPatientsFn,
            updatePatientFn,
            translateDiagnosisFn,
        } = props;

        this.api = new apig.RestApi(this, "RestAPI", {
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

        this.apiKey = new apig.ApiKey(this, "PatientsAPIKey", {
            apiKeyName: "Patients-API-Key",
            description: "API Key for Patient API",
        });

        const usagePlan = new apig.UsagePlan(this, "PatientsAPIUsagePlan", {
            name: "Patient API Usage Plan",
            apiStages: [
                {
                    api: this.api,
                    stage: this.api.deploymentStage,
                },
            ],
        });

        usagePlan.addApiKey(this.apiKey);

        const patientsEndpoint = this.api.root.addResource("patients");

        const patientEndpoint = patientsEndpoint.addResource("{patientId}");
        patientEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getPatientByIdFn, { proxy: true })
        );

        // Update patient endpoint (requires API Key)
        patientEndpoint.addMethod(
            "PUT",
            new apig.LambdaIntegration(updatePatientFn, { proxy: true }),
            {
                apiKeyRequired: true,
            }
        );

        const translateEndpoint = patientEndpoint.addResource("translate");
        translateEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(translateDiagnosisFn, { proxy: true })
        );

        // Get all patients endpoint
        patientsEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getAllPatientsFn, { proxy: true })
        );

        // Add new patient endpoint (requires API Key)
        patientsEndpoint.addMethod(
            "POST",
            new apig.LambdaIntegration(addNewPatientFn, { proxy: true }),
            {
                apiKeyRequired: true,
            }
        );
    }
}
