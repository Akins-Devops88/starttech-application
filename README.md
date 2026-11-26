# StartTech MuchTodo Application

A full-stack task management application developed for the StartTech DevOps assessment.

The project combines a React and TypeScript frontend with a Go (Gin) REST API. The application is containerised with Docker and deployed to Amazon EKS using Kubernetes manifests.

## 1. Project Overview

### Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Go, Gin |
| Database | MongoDB Atlas / MongoDB |
| Cache | Amazon ElastiCache for Redis |
| Containerisation | Docker |
| Container Registry | Amazon ECR |
| Orchestration | Amazon EKS, Kubernetes |
| Infrastructure | Terraform |
| Cloud Provider | AWS |
| Region | eu-west-2 (London) |

## 2. Repository Structure

```text
starttech-application/
├── backend/
│   ├── internal/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── evidence/
└── README.md
```

## 3. Application Features

- User registration and authentication.
- JWT-based authentication.
- Create, view, update, complete and delete tasks.
- MongoDB database persistence.
- Optional Redis caching.
- Health-check endpoint for application monitoring.
- React frontend communicating with the Go API.

## 4. Local Development

### Prerequisites

- Go
- Node.js and npm
- Docker and Docker Compose
- Git

### 4.1 Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and replace the example values with your local development configuration. Never commit credentials or secrets.

Start the backend and MongoDB:

```bash
docker compose up --build
```

The backend API listens on port 8080.

Test the health endpoint:

```bash
curl http://localhost:8080/health
```

### 4.2 Frontend Setup

Open another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --host 0.0.0.0
```

Open the frontend at http://localhost:5173.

The Vite development proxy forwards `/api` requests to the local backend.

### 4.3 Production Build

```bash
cd frontend
npm run build
```

The production frontend files are generated in `frontend/dist`.
## 5. Backend API

The Go backend exposes the following REST API endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Application health check |
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate a user |
| POST | `/auth/logout` | Log out |
| GET | `/users/me` | Retrieve current user |
| PUT | `/users/me` | Update current user |
| POST | `/todos/` | Create a task |
| GET | `/todos/` | List tasks |
| GET | `/todos/:id` | Retrieve a task |
| PUT | `/todos/:id` | Update a task |
| DELETE | `/todos/:id` | Delete a task |

Swagger API documentation is available under `/swagger/*any` when the backend is running.

## 6. Kubernetes Deployment

Kubernetes manifests are maintained in the `k8s/` directory.

The deployment includes:
- A dedicated `muchtodo` namespace.
- Application configuration through a ConfigMap.
- Sensitive configuration supplied through a Kubernetes Secret.
- A Deployment with two backend replicas.
- A ClusterIP Service exposing port 8080.
- An AWS Application Load Balancer Ingress.

The Deployment uses a RollingUpdate strategy with `maxSurge: 1` and `maxUnavailable: 0`.
### 6.1 Connect to Amazon EKS

Configure kubectl using the AWS CLI:

```bash
aws eks update-kubeconfig --region eu-west-2 --name starttech-assessment-eks --profile starttech-admin
```

Verify cluster connectivity:

```bash
kubectl get nodes
```

### 6.2 Deploy Kubernetes Resources

Apply the application manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

Create the Kubernetes Secret separately using the required environment values. Never commit secret values or credentials to Git.

### 6.3 Verify the Deployment

```bash
kubectl get pods -n muchtodo
kubectl get deployments -n muchtodo
kubectl get services -n muchtodo
kubectl get ingress -n muchtodo
kubectl rollout status deployment/starttech-backend -n muchtodo
```
## 7. AWS Deployment Architecture

The application infrastructure uses the following AWS services:

- Amazon VPC for network isolation.
- Public and private subnets across availability zones.
- Amazon EKS for Kubernetes orchestration.
- Amazon ECR for backend container images.
- AWS Application Load Balancer for backend ingress.
- Amazon ElastiCache for Redis.
- MongoDB for application data persistence.

### Container Registry

The backend image is stored in Amazon ECR:

```text
938917088089.dkr.ecr.eu-west-2.amazonaws.com/starttech-backend-api
```

### Current Deployment Configuration

- AWS region: eu-west-2 (London).
- EKS cluster: starttech-assessment-eks.
- Kubernetes namespace: muchtodo.
- Backend replicas: 2.
- Backend container port: 8080.
- Application Load Balancer currently exposes HTTP on port 80.

HTTPS termination and CloudFront frontend delivery must be configured and verified separately before being considered complete.

## 8. Security Practices

- Environment files containing credentials are excluded from Git.
- Example environment templates contain placeholders, not production secrets.
- Kubernetes sensitive values are supplied through Secrets.
- Redis connections use TLS in the deployed application configuration.
- Redis network access is restricted through security group rules.
- The EKS API endpoint is restricted by an allowed IP range.
- The backend container runs as a non-root user.

Never commit AWS credentials, database passwords, JWT signing keys, Terraform state files, or Kubernetes Secret values.
## 9. Deployment Evidence

The `evidence/` directory contains deployment verification outputs, including:

- Backend health-check responses.
- Backend pod status and logs.
- Kubernetes Service information.
- Ingress endpoint responses.
- EKS worker node information.

These files provide supporting evidence of the deployed application and infrastructure.

## 10. Related Repositories

### Application Repository
https://github.com/Akins-Devops88/starttech-application

### Infrastructure Repository
https://github.com/Akins-Devops88/starttech-infra

## 11. Important Notes

- Do not commit `.env` files, AWS credentials, Terraform state, or Kubernetes Secret values.
- Use the `.env.example` files as templates for local configuration.
- Verify AWS infrastructure settings before making changes to deployed resources.
- CloudFront, private S3 frontend hosting, HTTPS delivery, and automated GitHub Actions deployment should only be described as completed after implementation and verification.
