import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../../shared/util";

// Define interface for construct properties
export interface DatabaseConstructProps {
    patientsSeedData?: any[];
}

export class DatabaseConstruct extends Construct {
    public readonly patientsTable: dynamodb.Table;
    public readonly translationsTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: DatabaseConstructProps) {
        super(scope, id);

        this.patientsTable = new dynamodb.Table(this, "PatientsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Patients",
        });

        this.translationsTable = new dynamodb.Table(this, "TranslationsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Translations",
        });

        if (props?.patientsSeedData && props.patientsSeedData.length > 0) {
            new custom.AwsCustomResource(this, "patientsddbInitData", {
                onCreate: {
                    service: "DynamoDB",
                    action: "batchWriteItem",
                    parameters: {
                        RequestItems: {
                            [this.patientsTable.tableName]: generateBatch(
                                props.patientsSeedData
                            ),
                        },
                    },
                    physicalResourceId: custom.PhysicalResourceId.of(
                        "patientsddbInitData"
                    ),
                },
                policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                    resources: [this.patientsTable.tableArn],
                }),
            });
        }
    }
}
