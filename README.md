# Movie Reviews API - Serverless AWS Assignment 1

### Josh Crotty | 20096881@mail.wit.ie

## Project Overview

This project implements a serverless REST API using AWS CDK to provision necessary AWS resources. The API provides endpoints for managing movies in a DynamoDB table with features including retrieval of movies descriptions, filtering by rating, updates, and text translation.

## Architecture

The application uses a serverless architecture with the following AWS services:

-   AWS Lambda: For backend processing logic
-   Amazon API Gateway: For REST API endpoint exposure
-   Amazon DynamoDB: For data persistence
-   Amazon Translate: For text translation services
-   AWS IAM: For security and access control

| Method | Endpoint                                               | Description                                        | Authorization | Completed |
| ------ | ------------------------------------------------------ | -------------------------------------------------- | ------------- | --------- |
| GET    | `/movies/{movieId}`                                    | Retrieves movie content by movie ID                | None          | ✅        |
| GET    | `/movies/{movieId}?title=true&overview=true`           | Retrieves filtered movies with title and overview  | None          | ✅        |
| GET    | `/movies/{movieId}/overview/translation?language=code` | Retrieves a translated version of a movie overview | None          | ❌        |
| POST   | `/movies/movie`                                        | Creates a new movie                                | API Key       | ❌        |
| PUT    | `/movies/{movieId}/`                                   | Updates the text of an existing review             | API Key       | ❌        |

## Project Todo Itemised List 📝

| Task                                    | Description                                       | Status | Date of Completion |
| --------------------------------------- | ------------------------------------------------- | ------ | ------------------ |
| Create DynamoDB and seeding             | Set up a DynamoDB table and add initial seed data | ✅     | Tues 18th March    |
| Create basic Lambda functions           | Develop core Lambda functions for API operations  | ❌     | -                  |
| Translation Endpoint for movie synopsis | Develop Lambda function for AWS Translation       | ❌     | -                  |
| Implement a custom construct            | Create reusable infrastructure components         | ❌     | -                  |
| Add Lambda layers                       | Optimize code reuse by using Lambda layers        | ❌     | -                  |
| Build a multi-stack application         | Organize infrastructure into multiple CDK stacks  | ❌     | -                  |
