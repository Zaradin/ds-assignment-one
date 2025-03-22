import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { LambdaConstruct } from "./constructs/lambda-construct";
import { ApiGatewayConstruct } from "./constructs/api-construct";

export interface ApiStackProps extends cdk.StackProps {
    patientsTable: dynamodb.Table;
    translationsTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        // Extract tables from props
        const { patientsTable, translationsTable } = props;

        // Create Lambda functions construct
        const lambdaConstruct = new LambdaConstruct(this, "PatientLambdas", {
            patientsTable,
            translationsTable,
            region: this.region || "eu-west-1",
        });

        // Create API Gateway construct
        const apiConstruct = new ApiGatewayConstruct(this, "PatientApi", {
            getPatientByIdFn: lambdaConstruct.getPatientByIdFn,
            addNewPatientFn: lambdaConstruct.addNewPatientFn,
            getAllPatientsFn: lambdaConstruct.getAllPatientsFn,
            updatePatientFn: lambdaConstruct.updatePatientFn,
            translateDiagnosisFn: lambdaConstruct.translateDiagnosisFn,
        });
    }
}
