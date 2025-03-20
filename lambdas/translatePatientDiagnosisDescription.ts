import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import {
    TranslateClient,
    TranslateTextCommand,
} from "@aws-sdk/client-translate";

const ddbDocClient = createDDbDocClient();
const translateClient = new TranslateClient({ region: process.env.REGION });

// This blog post helped to get a better understanding on how to imlpement: https://medium.com/@abhishekkhaiwale007/building-a-real-time-translation-platform-combining-aws-ai-services-for-multilingual-communication-273cd55dabb3

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        // Get path parameters
        const parameters = event?.pathParameters;
        const patientId = parameters?.patientId
            ? parseInt(parameters.patientId)
            : undefined;

        // Get query parameters for language code
        const queryParams = event.queryStringParameters || {};
        const targetLanguage = queryParams.language;

        if (!patientId) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing patient ID" }),
            };
        }

        if (!targetLanguage) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: "Missing target language code",
                }),
            };
        }

        // Get the patient data by the passed ID
        const getCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id: patientId },
        });

        const patientResponse = await ddbDocClient.send(getCommand);

        if (!patientResponse.Item) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Patient not found" }),
            };
        }

        const patient = patientResponse.Item;
        const diagnosisText = patient.patientDiagnosisDescription;

        if (!diagnosisText) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: "No diagnosis information found for this patient",
                }),
            };
        }

        // Translate the diagnosis attribute
        const translateParams = {
            Text: diagnosisText,
            SourceLanguageCode: "en",
            TargetLanguageCode: targetLanguage,
        };

        const translateCommand = new TranslateTextCommand(translateParams);
        const translationResponse = await translateClient.send(
            translateCommand
        );

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                patientId: patientId,
                originalLanguageCode: "en",
                targetLanguageCode: targetLanguage,
                originalText: diagnosisText,
                translatedText: translationResponse.TranslatedText,
            }),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));

        // Handle specific AWS Translate errors
        if (error.name === "UnsupportedLanguagePairException") {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: "Unsupported language pair for translation",
                    error: error.message,
                }),
            };
        }

        if (error.name === "InvalidParameterValueException") {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: "Invalid language code",
                    error: error.message,
                }),
            };
        }

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
