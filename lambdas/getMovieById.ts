import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    QueryCommand,
    QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));
        const pathParameters = event?.pathParameters;
        const queryParameters = event?.queryStringParameters || {};
        const movieId = pathParameters?.movieId
            ? parseInt(pathParameters.movieId)
            : undefined;

        if (!movieId) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Missing movie Id" }),
            };
        }

        // Get movie metadata
        const movieCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id: movieId },
        });

        const movieResponse = await ddbDocClient.send(movieCommand);
        console.log("GetCommand response: ", movieResponse);

        if (!movieResponse.Item) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Invalid movie Id" }),
            };
        }

        const movieData = movieResponse.Item;
        let responseData: any;

        // Check if specific fields are requested via query parameters
        const hasFilters = Object.keys(queryParameters).length > 0;

        if (hasFilters) {
            // Filter the movie data based on query parameters
            const filteredData: Record<string, any> = {};

            // Always include the ID
            filteredData.id = movieData.id;

            // Add requested fields
            Object.keys(queryParameters).forEach((param) => {
                const isRequested =
                    queryParameters[param]?.toLowerCase() === "true";

                if (isRequested && movieData.hasOwnProperty(param)) {
                    filteredData[param] = movieData[param];
                }
            });

            responseData = filteredData;
        } else {
            // If no filters, return the full movie data
            responseData = movieData;
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
            body: JSON.stringify({ error }),
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
