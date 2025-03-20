import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Patient"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        // Get path parameters
        const parameters = event?.pathParameters;
        const patientId = parameters?.patientId
            ? parseInt(parameters.patientId)
            : undefined;

        if (!patientId) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing patient ID" }),
            };
        }

        // Parse request body
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing request body" }),
            };
        }

        // Validate body against schema
        if (!isValidBodyParams(body)) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: `Incorrect type. Must match the Patient schema`,
                    schema: schema.definitions["Patient"],
                }),
            };
        }

        // Update the patient - using a simple approach with direct field references
        const commandOutput = await ddbDocClient.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    id: patientId,
                },
                UpdateExpression:
                    "SET firstName = :fn, lastName = :ln, dateOfBirth = :dob, gender = :g, lastVisitDate = :lvd, patientDiagnosisDescription = :pdd",
                ExpressionAttributeValues: {
                    ":fn": body.firstName,
                    ":ln": body.lastName,
                    ":dob": body.dateOfBirth,
                    ":g": body.gender,
                    ":lvd": body.lastVisitDate,
                    ":pdd": body.patientDiagnosisDescription,
                },
            })
        );

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: "Patient updated successfully",
            }),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
