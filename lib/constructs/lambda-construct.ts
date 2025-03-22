import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export interface LambdaConstructProps {
    patientsTable: dynamodb.Table;
    translationsTable: dynamodb.Table;
    region: string;
}

export class LambdaConstruct extends Construct {
    public readonly getPatientByIdFn: lambdanode.NodejsFunction;
    public readonly addNewPatientFn: lambdanode.NodejsFunction;
    public readonly getAllPatientsFn: lambdanode.NodejsFunction;
    public readonly updatePatientFn: lambdanode.NodejsFunction;
    public readonly translateDiagnosisFn: lambdanode.NodejsFunction;

    constructor(scope: Construct, id: string, props: LambdaConstructProps) {
        super(scope, id);

        const { patientsTable, translationsTable, region } = props;

        this.getPatientByIdFn = new lambdanode.NodejsFunction(
            this,
            "GetPatientByIdFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../../lambdas/getPatientById.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: region,
                },
            }
        );

        this.addNewPatientFn = new lambdanode.NodejsFunction(
            this,
            "AddNewPatientFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_22_X,
                entry: `${__dirname}/../../lambdas/addPatient.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: region,
                },
            }
        );

        this.getAllPatientsFn = new lambdanode.NodejsFunction(
            this,
            "GetAllPatientsFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../../lambdas/getAllPatients.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: region,
                },
            }
        );

        this.updatePatientFn = new lambdanode.NodejsFunction(
            this,
            "UpdatePatientFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../../lambdas/updatePatient.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: patientsTable.tableName,
                    REGION: region,
                },
            }
        );

        this.translateDiagnosisFn = new lambdanode.NodejsFunction(
            this,
            "TranslateDiagnosisFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../../lambdas/translatePatientDiagnosisDescription.ts`,
                timeout: cdk.Duration.seconds(15),
                memorySize: 128,
                environment: {
                    PATIENTS_TABLE: patientsTable.tableName,
                    TRANSLATIONS_TABLE: translationsTable.tableName,
                    REGION: region,
                },
            }
        );

        patientsTable.grantReadData(this.getPatientByIdFn);
        patientsTable.grantReadWriteData(this.addNewPatientFn);
        patientsTable.grantReadData(this.getAllPatientsFn);
        patientsTable.grantReadWriteData(this.updatePatientFn);
        patientsTable.grantReadData(this.translateDiagnosisFn);

        translationsTable.grantReadWriteData(this.translateDiagnosisFn);

        this.translateDiagnosisFn.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ["translate:TranslateText"],
                resources: ["*"],
                effect: cdk.aws_iam.Effect.ALLOW,
            })
        );
    }
}
