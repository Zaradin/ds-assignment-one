import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./constructs/database-construct";
import { patients } from "../seed/patients";

export class DatabaseStack extends cdk.Stack {
    // Public properties to expose resources to other stacks
    public readonly databaseConstruct: DatabaseConstruct;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create the database construct
        this.databaseConstruct = new DatabaseConstruct(
            this,
            "PatientDatabases",
            {
                patientsSeedData: patients,
            }
        );
    }
}
