import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./constructs/database-construct";
import { LambdaConstruct } from "./constructs/lambda-construct";
import { ApiGatewayConstruct } from "./constructs/api-construct";
import { patients } from "../seed/patients";

export class DsAssignmentOneStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const databaseConstruct = new DatabaseConstruct(
            this,
            "PatientDatabases",
            {
                patientsSeedData: patients,
            }
        );

        const lambdaConstruct = new LambdaConstruct(this, "PatientLambdas", {
            patientsTable: databaseConstruct.patientsTable,
            translationsTable: databaseConstruct.translationsTable,
            region: this.region || "eu-west-1",
        });

        const apiConstruct = new ApiGatewayConstruct(this, "PatientApi", {
            getPatientByIdFn: lambdaConstruct.getPatientByIdFn,
            addNewPatientFn: lambdaConstruct.addNewPatientFn,
            getAllPatientsFn: lambdaConstruct.getAllPatientsFn,
            updatePatientFn: lambdaConstruct.updatePatientFn,
            translateDiagnosisFn: lambdaConstruct.translateDiagnosisFn,
        });
    }
}
