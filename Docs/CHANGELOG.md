# Changelog

All notable changes to the OER-AI project after December 16, 2024.

---

## v1.2.5 (January 2026)

### Performance Optimizations

**Provisioned Concurrency**

- Enabled provisioned concurrency for both Text Generation and Practice Material Lambda functions
- Eliminates cold start delays (previously 5-10 seconds) for AI-powered features
- Lambda functions are always warm and ready to respond immediately
- Documented trade-offs between provisioned concurrency and EventBridge warmup in `ARCHITECTURE_DEEP_DIVE.md`



**Frontend Performance**

- Implemented client-side caching for textbook data using sessionStorage (5-minute TTL)
- Parallel API fetching: welcome message and textbooks now load concurrently using `Promise.all`
- Eliminates waterfall loading pattern on homepage, saving ~500ms-1s on initial load

### Text Generation Improvements

- Refactored text generation code into modular functions for better maintainability
- Implemented parallel pre-flight checks to reduce latency
- Python version bumped to 3.12 for both Docker functions

### CI/CD Pipeline

- Migrated from GitHub Personal Access Tokens (PAT) to GitHub OAuth Apps
- Provides more stable authentication without token expiration concerns
- Updated deployment documentation with new GitHub App setup instructions

### Infrastructure

- Embedding region is now configurable via SSM Parameter instead of hardcoded `us-east-1`
- Improved flexibility for multi-region deployments

---

### Practice Material Optimization

**WebSocket Migration**

- Migrated practice material generation from REST API to WebSocket implementation to resolve cold start timeout issues (previously hard-limited to 29 seconds)
- Enables real-time progress updates during material generation, allowing users to see which step of the generation process is currently active
- Lambda function can now stay active for extended periods without API timeout bottlenecks

**Performance Improvements**

- Implemented Lambda pre-warming that activates as soon as users enter the website, reducing cold start latency before reaching the practice material page
- Optimized LLM prompts to support generation of up to 20 questions with 6 options each

**Security Enhancements**

- Added validation for textbook IDs during practice material generation
- Implemented guardrails to filter out content unrelated to the textbook and prevent prompt injection attacks


### Analytics

- Extended analytics date range in admin view to support up to 365 days in the past
- Admins can now select any value between 1-365 days for analytics reporting

---




_For more information about specific features or changes, please refer to the relevant documentation in the `Docs/` folder or contact the development team._
