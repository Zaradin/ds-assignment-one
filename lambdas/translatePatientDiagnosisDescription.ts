import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
    TranslateClient,
    TranslateTextCommand,
} from "@aws-sdk/client-translate";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
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
        const getPatientCommand = new GetCommand({
            TableName: process.env.PATIENTS_TABLE,
            Key: { id: patientId },
        });

        const patientResponse = await ddbDocClient.send(getPatientCommand);

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

        // Create a unique ID for this translation in the translations table
        const translationId = `${patientId}_${targetLanguage}`;

        // Check if translation already exists in the translations table
        const getTranslationCommand = new GetCommand({
            TableName: process.env.TRANSLATIONS_TABLE,
            Key: { id: translationId },
        });

        let fromCache = false;
        let translatedText;

        const translationResponse = await ddbDocClient.send(
            getTranslationCommand
        );

        // Check if we have a cached translation and if the original text matches
        if (
            translationResponse.Item &&
            translationResponse.Item.translatedText &&
            translationResponse.Item.originalText === diagnosisText
        ) {
            // Translation found in cache and original text matches current diagnosis
            console.log(`Using cached translation with ID: ${translationId}`);
            translatedText = translationResponse.Item.translatedText;
            fromCache = true;
        } else if (
            translationResponse.Item &&
            translationResponse.Item.originalText !== diagnosisText
        ) {
            console.log(
                "Diagnosis text has changed, translation needs updating"
            );
        }

        // If translation not in cache, call AWS Translate
        if (!translatedText) {
            console.log(`Performing new translation to ${targetLanguage}`);
            const translateParams = {
                Text: diagnosisText,
                SourceLanguageCode: "en",
                TargetLanguageCode: targetLanguage,
            };

            const translateCommand = new TranslateTextCommand(translateParams);
            const translationResponse = await translateClient.send(
                translateCommand
            );

            translatedText = translationResponse.TranslatedText;

            // Save the translation to the translations table
            const putTranslationCommand = new PutCommand({
                TableName: process.env.TRANSLATIONS_TABLE,
                Item: {
                    id: translationId,
                    patientId: patientId,
                    language: targetLanguage,
                    originalText: diagnosisText,
                    translatedText: translatedText,
                    timestamp: new Date().toISOString(),
                },
            });

            await ddbDocClient.send(putTranslationCommand);
        }

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
                translatedText: translatedText,
                fromCache: fromCache,
            }),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));

        // Handle AWS Translate errors
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
