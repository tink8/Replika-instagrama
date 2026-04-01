
<p align="center">
  <img src="frontend/public/pikmin-converted-from-webp.svg" alt="InstaClone logo" width="80" />
</p>


# InstaClone

A full-stack Instagram clone built as a microservices architecture. Users can register, create posts with multiple images/videos, follow other users, like and comment on posts, manage privacy settings, and browse a personalized feed.

## Architecture

The application consists of **6 microservices and an API Gateway**, each with its own database schema, communicating over a private Docker network:

```
                        ┌──────────────┐
                        │   Frontend   │
                        │  React + TS  │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ API Gateway  │  ← JWT validation (RS256)
                        │   :8000      │
                        └──────┬───────┘
               ┌───────┬───────┼───────┬────────┬────────┐
               ▼       ▼       ▼       ▼        ▼        ▼
          ┌────────┐┌──────┐┌──────┐┌───────┐┌───────┐┌──────┐
          │  Auth  ││ User ││ Post ││Social ││ Feed  ││Inter-│
          │ :8001  ││:8002 ││:8003 ││ :8004 ││ :8005 ││action│
          └────────┘└──────┘└──────┘└───────┘└───────┘│:8006 │
               │       │       │       │              └──────┘
               └───────┴───┬───┴───────┴─────────────────┘
                     ┌─────▼─────┐  ┌───────┐  ┌───────┐
                     │  MySQL 8  │  │ MinIO │  │ Redis │─────── Feed-service
                     └───────────┘  └───────┘  └───────┘
                                        │
                                   User-service
                                   Post-service
```

| Service | Port | Responsibilities |
|---------|------|-----------------|
| **API Gateway** | 8000 | JWT validation, request routing, rate limiting |
| **Auth Service** | 8001 | Registration, login, logout, token refresh (RS256 JWT) |
| **User Service** | 8002 | Profile management, avatar upload, user search |
| **Post Service** | 8003 | Create/edit/delete posts, media upload  |
| **Social Service** | 8004 | Follow/unfollow, follow requests, blocking, access control |
| **Feed Service** | 8005 | Personalized timeline with Redis caching (60s TTL) |
| **Interaction Service** | 8006 | Likes, comments (CRUD), interaction counts |

## Internal service-to-service communication (via /internal/ routes, not exposed through API Gateway):

- Auth → User (create profile on register, lookup on login)
- User → Social (block check, follower/following counts)
- User → Post (post count for profile)
- Post → Social (access/privacy check)
- Post → Interaction (like/comment counts)
- Interaction → Post (verify post exists + get owner)
- Interaction → Social (access check before like/comment)
- Interaction → User (batch lookup to enrich comments with usernames/avatars)
- Feed → Social (get list of followed users)
- Feed → Post (get posts by followed users)
- Feed → Interaction (get like/comment counts)
- Feed → User (batch lookup to enrich post authors)
- Social → Interaction (purge interactions on block)

## Key Implementation Details

### Partial Zero-Trust Security Model

Every public API request goes through **two layers of JWT verification**:

1. **API Gateway** validates the JWT signature (RS256 public key) and attaches `X-User-Id` to the forwarded request
2. **Each downstream service** independently re-verifies the JWT using its own copy of the public key

Internal routes between services (`/internal/...`) are **not exposed** through the API Gateway and are only reachable within the Docker network. These routes do not require JWT authentication since they are trusted service-to-service calls.

### Access Control

The Social Service acts as a centralized access control authority. Before serving content, services like Post, Interaction, and User call `/internal/social/check-access/:targetUserId` to verify that:

- The target user has not blocked the requester (and vice versa)
- The profile is public, or the requester is an approved follower

Blocked users receive `404 Not Found` instead of `403 Forbidden` to prevent revealing profile existence.

### Inter-Service Communication

Services communicate internally using HTTP clients over the Docker network. All internal routes are prefixed with `/internal/` and follow documented contracts (see [`docs/`](docs/)).

```
Auth ──────────► User Service        (create profile, lookup on login)
Post Service ──► Social Service      (access checks on view)
Interaction ───► Social Service      (access checks before like/comment)
Interaction ───► Post Service        (verify post exists + get owner)
Interaction ───► User Service        (enrich comments with usernames/avatars)
Feed ──────────► Social + Post + Interaction + User (aggregate timeline)
Social ────────► Interaction Service (purge interactions on block)
User ──────────► Social + Post       (block check, post count for profile)
```

### Media Storage

Post images/videos and user avatars are stored in **MinIO** (S3-compatible object storage). Post media cleanup is handled automatically on post deletion. When the last media item is deleted from a post, the entire post is auto-deleted.

### Feed Caching

The Feed Service uses **Redis** with a 60-second TTL to cache personalized feeds. A dedicated `/api/feed/refresh` endpoint allows users to bypass the cache and fetch the latest posts.

### Edge Case Handling

The application handles various edge cases that were identified during testing:
- Empty/whitespace-only usernames and comment text are rejected with proper validation
- Blocked users are hidden from search results
- Blocking a user automatically unfollows in both directions and purges all mutual interactions (likes/comments)
- Private profile post counts are retrieved via internal routes to avoid access check conflicts
- React `StrictMode` double-fetch prevention using `AbortController`
- Stale closure prevention in React effects using `useRef` pattern

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, React Router v7, Lucide Icons |
| Backend | Node.js, Express |
| Database | MySQL 8.0 (one schema per service) |
| Object Storage | MinIO |
| Caching | Redis |
| Auth | JWT with RS256 (asymmetric key pair) |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Team Roles

| Role | Team | Services |
|------|------|----------|
| **Backend Engineer A** |Tijana Mijatović (606/2022)|Auth Service, User Service, API Gateway, DevOps (CI/CD, Docker) |
| **Backend Engineer B** |Tijana Mijatović (606/2022)| Post Service, Interaction Service |
| **Backend Engineer C** |Jovana Marković (618/2022)|Feed Service, Social Service |
| **Frontend Engineer** |Anastasija Stevanović (614/2022)|React frontend application |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- RSA key pair in the `keys/` directory (`private.pem` and `public.pem`)

### Install dependencies
Using npm:
```bash
npm install
```

### Generate RSA Keys

```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### Environment Variables

Create a `.env` file in the project root with the required variables (database credentials, MinIO keys, service ports). Each service may also have its own `.env` file for service-specific configuration.

### Start All Services

```bash
docker compose up --build
```

For a clean start (resets databases):

```bash
docker compose down -v
docker compose up --build
```

### Start Frontend (Development)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` requests to the API Gateway at `http://localhost:8000`.

## Testing

### Unit Tests

Each backend service has its own unit test suite using **Jest** with ESM support. Tests cover controllers, middleware, and edge cases.

```bash
# Run tests for a specific service
cd <service-name>
npm test

# Example
cd post-service
npm test
```

### Integration Tests (API)

A comprehensive integration test suite with **113 tests** across all 6 API services, located in the `tests/` directory. These tests run against the live Docker environment through the API Gateway.

```bash
# Start all services first
docker compose up --build -d

# Run all integration tests
cd tests
npm install
npm test

# Run tests for a specific service
npm run test:auth
npm run test:users
npm run test:social
npm run test:posts
npm run test:interactions
npm run test:feed
```

**Test environment:** Use `docker-compose.test.yml` as an override to set `NODE_ENV=test`, which disables rate limiting for test runs:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml up --build -d
```

### Integration Tests (UI)

Ensure the application is running (UI + Backend)
```bash
docker compose up -d
```
Navigate to the test directory
```bash
cd ui-tests
```
Install Playwright browsers (first time only)
```bash
npx playwright install
```
Run all UI tests
```bash
npx playwright test
```
Run tests in headed mode (to see the browser)
```bash
npx playwright test --headed
```
Show test report
```bash
npx playwright show-report
```
## CI/CD Pipeline

Automated via **GitHub Actions** (`.github/workflows/main.yml`):

| Trigger | Actions |
|---------|---------|
| **Pull Request to `main`** | Runs unit tests for all services in parallel |
| **Push to `main`** | Runs unit tests + builds Docker images and pushes to Docker Hub with timestamp versioning (`yyyymmdd-hhmmss`) |

Each service is built and tested independently using a matrix strategy. Docker images are tagged with both `latest` and a timestamp tag (e.g., `20251216-192811`).

## API Documentation

Full API route documentation and error contracts are available in the [`docs/`](docs/) directory:

- [`Api-Routes.litcoffee`](docs/Api-Routes.litcoffee) — All public and internal endpoints for every service
- [`Api-Error_Service_Contracts.litcoffee`](docs/Api-Error_Service_Contracts.litcoffee) — Error response formats, status codes, and service contracts
