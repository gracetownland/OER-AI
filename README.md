# OER-AI Assistant

This prototype explores how Large Language Models (LLMs) can enhance educational experiences by enabling intelligent interaction with Open Educational Resources (OER) textbooks. By leveraging Retrieval-Augmented Generation (RAG), multimodal embeddings, and conversational AI, it provides students with personalized learning assistance, practice material generation, and adaptive tutoring through natural language conversations with textbook content.

| Index                                               | Description                                             |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [High Level Architecture](#high-level-architecture) | High level overview illustrating component interactions |
| [Deployment](#deployment-guide)                     | How to deploy the project                               |
| [User Guide](#user-guide)                           | The working solution                                    |
| [Directories](#directories)                         | General project directory structure                     |
| [Database Schema](#database-schema)                 | Database schema visualization                           |
| [Credits](#credits)                                 | Meet the team behind the solution                       |
| [License](#license)                                 | License details                                         |

## High-Level Architecture

The following architecture diagram illustrates the various AWS components utilized to deliver the solution. For an in-depth explanation of the frontend and backend stacks, please look at the [Architecture Deep Dive](Docs/architectureDeepDive.md).

![Architecture Diagram](Docs/media/architecture-diagram.png)

## Deployment Guide

To deploy this solution, please follow the steps laid out in the [Deployment Guide](Docs/DEPLOYMENT_GUIDE.md)

## User Guide

Please refer to the [Web App User Guide](Docs/userGuide.md) for instructions on navigating the web app interface.

## Directories

```
├── cdk/
│   ├── bin/
│   ├── lambda/
│   │   ├── adminAuthorizerFunction/
│   │   ├── authorization/
│   │   ├── config/
│   │   ├── csvProcessor/
│   │   ├── dataIngestion/
│   │   ├── db_setup/
│   │   │   ├── migrations/
│   │   │   └── schema.dbml
│   │   ├── generatePresignedURL/
│   │   ├── h5pExport/
│   │   ├── handlers/
│   │   ├── jobProcessor/
│   │   ├── practiceMaterial/
│   │   ├── publicTokenFunction/
│   │   ├── textGeneration/
│   │   └── websocket/
│   ├── lib/
│   │   ├── amplify-stack.ts
│   │   ├── api-stack.ts
│   │   ├── cicd-stack.ts
│   │   ├── data-pipeline-stack.ts
│   │   ├── database-stack.ts
│   │   ├── dbFlow-stack.ts
│   │   └── vpc-stack.ts
│   └── OpenAPI_Swagger_Definition.yaml

├── Docs/
│   └── DEPLOYMENT_GUIDE.md

├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Admin/
│       │   ├── ChatInterface/
│       │   ├── PracticeMaterial/
│       │   └── ui/
│       ├── contexts/
│       ├── lib/
│       ├── pages/
│       │   ├── Admin/
│       │   ├── ChatInterface/
│       │   └── PracticeMaterial/
│       └── main.tsx
```

1. `/cdk`: Contains the deployment code for the app's AWS infrastructure
   - `/bin`: Contains the instantiation of CDK stacks
   - `/lambda`: Contains the Lambda functions for data ingestion, text generation, practice material generation, and other core functionalities
     - `/adminAuthorizerFunction`: Admin authentication and authorization
     - `/authorization`: User authorization logic
     - `/config`: Configuration management (welcome messages, system settings)
     - `/csvProcessor`: Processes CSV files containing textbook metadata
     - `/dataIngestion`: Handles textbook ingestion and processing
     - `/db_setup`: Database migrations and schema definitions
     - `/generatePresignedURL`: S3 presigned URL generation for file uploads
     - `/h5pExport`: H5P interactive content export functionality
     - `/handlers`: API handlers for admin, chat, FAQ, and analytics operations
     - `/jobProcessor`: Processes SQS messages and triggers Glue jobs
     - `/practiceMaterial`: Generates practice questions, flashcards, and quizzes
     - `/publicTokenFunction`: Public token generation for unauthenticated access
     - `/textGeneration`: RAG-based conversational AI using Amazon Bedrock
     - `/websocket`: WebSocket connection handlers for real-time chat
   - `/lib`: Contains the CDK stack definitions
     - `amplify-stack.ts`: AWS Amplify frontend hosting
     - `api-stack.ts`: API Gateway, Lambda functions, and WebSocket APIs
     - `cicd-stack.ts`: CI/CD pipeline configuration
     - `data-pipeline-stack.ts`: S3, SQS, Glue jobs for data processing
     - `database-stack.ts`: RDS PostgreSQL with pgvector extension
     - `dbFlow-stack.ts`: Database migration management
     - `vpc-stack.ts`: VPC, subnets, and networking configuration
   - `OpenAPI_Swagger_Definition.yaml`: API specification for the OER-AI service
2. `/Docs`: Contains comprehensive documentation for the application
   - `DEPLOYMENT_GUIDE.md`: Step-by-step deployment instructions
3. `/frontend`: Contains the React + TypeScript user interface
   - `/components`: Reusable UI components for admin, chat, and practice materials
   - `/contexts`: React contexts for state management
   - `/lib`: Utility functions and API clients
   - `/pages`: Main application pages and routes

## Database Schema

The application uses PostgreSQL with the pgvector extension for semantic search capabilities. The database schema includes tables for:

- **Core Content**: Users, textbooks, sections, media items, document chunks, and embeddings
- **Sessions & Interactions**: User sessions, chat sessions, and message history
- **Prompts & FAQ**: Prompt templates, guided prompts, shared prompts, and FAQ cache
- **Jobs & Analytics**: Ingestion jobs, analytics events, and practice material tracking
- **System Configuration**: System settings and configuration

For a detailed visualization of the database schema, see the [DBML schema file](cdk/lambda/db_setup/schema.dbml). You can visualize this schema at [dbdiagram.io](https://dbdiagram.io).

![Database Schema](PLACEHOLDER_DATABASE_SCHEMA_DIAGRAM)

## Key Features

### For Students

- **Conversational AI Tutor**: Ask questions about textbook content and receive guided, Socratic-style responses
- **Practice Material Generation**: Generate multiple-choice questions, flashcards, and short-answer questions
- **Multi-Textbook Support**: Access multiple textbooks within a single interface
- **Session Management**: Save and resume chat sessions across devices
- **Text-to-Speech**: Listen to AI responses with built-in speech synthesis

### For Administrators

- **Textbook Management**: Upload and manage OER textbooks via CSV or direct URL
- **Content Ingestion**: Automated processing of textbook content with progress tracking
- **Analytics Dashboard**: Monitor usage, popular questions, and system performance
- **FAQ Management**: Review and manage frequently asked questions
- **System Configuration**: Customize AI behavior, welcome messages, and token limits
- **User Management**: Manage admin users through AWS Cognito

## Technology Stack

### Frontend

- **React** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **AWS Amplify** for hosting

### Backend

- **AWS Lambda** (Python & Node.js) for serverless compute
- **Amazon Bedrock** for LLM inference (Llama 3 70B Instruct)
- **Amazon Titan Embeddings V2** for multimodal embeddings
- **PostgreSQL** with **pgvector** for vector storage
- **AWS Glue** for ETL data processing
- **Amazon S3** for object storage
- **Amazon SQS** for message queuing
- **API Gateway** (REST & WebSocket) for APIs
- **AWS Cognito** for authentication

### Infrastructure

- **AWS CDK** (TypeScript) for infrastructure as code
- **AWS CodePipeline** for CI/CD
- **Amazon RDS** for managed PostgreSQL
- **Amazon VPC** for network isolation

## Credits

This application was architected and developed by the UBC Cloud Innovation Centre team. Thanks to the UBC CIC Technical and Project Management teams for their guidance and support.

## License

This project is distributed under the [MIT License](LICENSE).

Licenses of libraries and tools used by the system are listed below:

[PostgreSQL License](https://www.postgresql.org/about/licence/)

- For PostgreSQL and pgvector
- "a liberal Open Source license, similar to the BSD or MIT licenses."

[LLaMa 3 Community License Agreement](https://llama.meta.com/llama3/license/)

- For Llama 3 70B Instruct model

[Amazon Titan License](https://aws.amazon.com/bedrock/titan/)

- For Amazon Titan Embeddings V2

[MIT License](https://opensource.org/licenses/MIT)

- For various open-source libraries and components used in this project
