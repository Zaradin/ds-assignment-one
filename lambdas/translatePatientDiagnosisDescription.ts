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
        // Get patient ID from path parameters
        const patientId = event?.pathParameters?.patientId
            ? parseInt(event.pathParameters.patientId)
            : undefined;

        // Using spanish 'ES' for testing the translation instead of usnig passed params
        const targetLanguage = "es";

        // Get the patient data
        const getCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id: patientId },
        });

        const patientResponse = await ddbDocClient.send(getCommand);
        const patient = patientResponse.Item;
        const diagnosisText = patient?.patientDiagnosisDescription;

        // Translate the diagnosis
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
                translatedText: translationResponse.TranslatedText,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error: "An error occurred" }),
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
