# Contributing to Anuvaad

First off, thank you for considering contributing to Anuvaad! We appreciate all contributions, from bug reports to pull requests.

## Development Setup

1. Fork the repository and clone it locally
2. Create a virtual environment for the backend (`python -m venv venv`) and install dependencies (`pip install -r requirements.txt`)
3. Install frontend dependencies (`cd frontend && npm install`)
4. Ensure you have the required environment variables set up (see `README.md`)

## Pull Request Process

1. Ensure your code conforms to the project's style (run `ruff` for Python, `eslint` and `prettier` for TypeScript)
2. Include unit tests for any new functionality
3. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters
4. You may merge the Pull Request in once you have the sign-off of at least one other developer, or if you do not have permission to do that, you may request the reviewer to merge it for you

## Code Style
- **Backend:** We use `ruff` for linting and formatting. Type hints are strongly encouraged.
- **Frontend:** We use Next.js, ESLint, and Prettier. Please follow the existing component structure and use `shadcn/ui` components where applicable.
