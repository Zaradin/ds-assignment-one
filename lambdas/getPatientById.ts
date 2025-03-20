import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));
        const pathParameters = event?.pathParameters;
        const queryParameters = event?.queryStringParameters || {};
        const patientId = pathParameters?.patientId
            ? parseInt(pathParameters.patientId)
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

        // Get patient data
        const patientCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id: patientId },
        });

        const patientResponse = await ddbDocClient.send(patientCommand);
        console.log("GetCommand response: ", patientResponse);

        if (!patientResponse.Item) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Patient not found" }),
            };
        }

        const patientData = patientResponse.Item;
        let responseData: any;

        // Check if specific fields are requested via query parameters
        const hasFilters = Object.keys(queryParameters).length > 0;

        if (hasFilters) {
            // Filter the patient data based on query parameters
            const filteredData: Record<string, any> = {};

            // Always include the ID
            filteredData.id = patientData.id;

            // Add requested fields
            Object.keys(queryParameters).forEach((param) => {
                const isRequested =
                    queryParameters[param]?.toLowerCase() === "true";

                if (isRequested && patientData.hasOwnProperty(param)) {
                    filteredData[param] = patientData[param];
                }
            });

            responseData = filteredData;
        } else {
            // If no filters, return the full patient data
            responseData = patientData;
        }

        let responseBody = {
            data: responseData,
        };

        // Return Response
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(responseBody),
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
