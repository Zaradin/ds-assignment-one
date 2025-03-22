### Context.

My FYP project is an application where you can create patient profiles and also upload patient MRI scans, in which the images are sent to a classification model to predict if the patient has Alzheimer's disease.
This was the main premise in building the basic API functions.

Context: Patients

Table item attributes:

-   id - number (Partition key)
-   firstName - string (Patient First Name)
-   lastName - string (Patient Last Name)
-   dateOfBirth - string (Patient Last Name)
-   gender - string (Patient Last Name)
-   lastVisitDate - string (Patient Last Name)
-   patientDiagnosisDescription - string (Patient Last Name)

### App API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API) you have successfully implemented. ]
e.g.

-   GET /patients - Get all patients
-   GET /patients/{patientId} - Get a specific patient by ID
-   POST /patients - Add a new patient (requires API key)
-   PUT /patients/{patientId} - Update an existing patient (requires API key)
-   GET /patients/{patientId}/translate - Translate a patient's diagnosis description to another language

### Features.

#### Translation persistence (if completed)

The translation feature persists translations in a dedicated DynamoDB table to avoid redundant translation requests for the same content. The Translations table has the following structure

-   id - string (Partition key, composite of original text and target language)
-   originalText - string (The text to be translated)
-   targetLanguage - string (The language code for the translation)
-   translatedText - string (The resulting translated text)
-   timestamp - number (When the translation was performed)

#### Custom L2 Construct (if completed)

I've implemented three custom L2 constructs to improve code organization and reusability:

1. DatabaseConstruct: Provisions and manages DynamoDB tables

Construct Input props object:

```
type DatabaseConstructProps = {
  patientsSeedData?: any[];
}
```

Construct public properties:

```
export class DatabaseConstruct extends Construct {
  public readonly patientsTable: dynamodb.Table;
  public readonly translationsTable: dynamodb.Table;
}
```

2. LambdaConstruct: Manages Lambda functions and their configurations

Construct Input props object:

```
type LambdaConstructProps = {
  patientsTable: dynamodb.Table;
  translationsTable: dynamodb.Table;
  region: string;
}
```

Construct public properties:

```
export class LambdaConstruct extends Construct {
  public readonly getPatientByIdFn: lambdanode.NodejsFunction;
  public readonly addNewPatientFn: lambdanode.NodejsFunction;
  public readonly getAllPatientsFn: lambdanode.NodejsFunction;
  public readonly updatePatientFn: lambdanode.NodejsFunction;
  public readonly translateDiagnosisFn: lambdanode.NodejsFunction;
}
```

3. ApiGatewayConstruct: Sets up the API Gateway and endpoints

Construct Input props object:

```
type ApiGatewayConstructProps = {
  getPatientByIdFn: lambdanode.NodejsFunction;
  addNewPatientFn: lambdanode.NodejsFunction;
  getAllPatientsFn: lambdanode.NodejsFunction;
  updatePatientFn: lambdanode.NodejsFunction;
  translateDiagnosisFn: lambdanode.NodejsFunction;
}
```

Construct public properties:

```
export class ApiGatewayConstruct extends Construct {
  public readonly api: apig.RestApi;
  public readonly apiKey: apig.ApiKey;
}
```

#### Multi-Stack app (if completed)

The application uses a multi-stack architecture to separate concerns and improve maintainability:

1. DatabaseStack: Contains all database resources (DynamoDB tables for patients and translations)

-   Responsible for data persistence
-   Exposes database resources to other stacks
-   Handles database seeding

2. ApiStack: Contains Lambda functions and API Gateway

-   Depends on the DatabaseStack for table references
-   Manages all compute resources
-   Handles API configuration and security

#### API Keys. (if completed)

Using the below code snippet it sets up the functionality. When you want AUTH for an endpoint you need to add `apiKeyRequired: true` to the lambda functions.

```ts
this.apiKey = new apig.ApiKey(this, "PatientsAPIKey", {
    apiKeyName: "Patients-API-Key",
    description: "API Key for Patient API",
});

const usagePlan = new apig.UsagePlan(this, "PatientsAPIUsagePlan", {
    name: "Patient API Usage Plan",
    apiStages: [
        {
            api: this.api,
            stage: this.api.deploymentStage,
        },
    ],
});

usagePlan.addApiKey(this.apiKey);
```

### Extra (If relevant).

[ State any other aspects of your solution that use CDK/serverless features not covered in the lectures ]
