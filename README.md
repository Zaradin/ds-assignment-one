# Movie Reviews API - Serverless AWS Assignment 1

### Josh Crotty | 20096881@mail.wit.ie

## Project Overview

This project implements a serverless REST API using AWS CDK to provision necessary AWS resources. The API provides endpoints for managing movie reviews in a DynamoDB table with features including retrieval of reviews for specific movies, filtering by rating, updates, and text translation.

## Architecture

The application uses a serverless architecture with the following AWS services:

-   AWS Lambda: For backend processing logic
-   Amazon API Gateway: For REST API endpoint exposure
-   Amazon DynamoDB: For data persistence
-   Amazon Translate: For text translation services
-   AWS IAM: For security and access control

| Method | Endpoint                                               | Description                                                    | Authorization |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------- | ------------- |
| GET    | `/movies/{movieId}`                                    | Retrieves movie content by movie ID                            | None          |
| GET    | `/movies/?Rating=n`                                    | Retrieves filtered movies with rating greater than RatingGiven | None          |
| GET    | `/movies/{movieId}/overvoew/translation?language=code` | Retrieves a translated version of a movie overview             | None          |
| POST   | `/movies/movie`                                        | Creates a new movie                                            | API Key       |
| PUT    | `/movies/{movieId}/`                                   | Updates the text of an existing review                         | API Key       |
