# Mooncliq Orbit - Agent Rules

The following rules MUST be strictly followed by the AI Agent for this repository.

## 1. UI & Layout Regression Prevention
- **Rule:** Before modifying any global layout components (e.g., `DashboardLayoutWrapper`, `layout.js`, `Sidebar.js`), you MUST explicitly verify that the changes do not break authentication pages (`/sign-in`, `/sign-up`, `/forgot-password`). 
- **Rule:** Never introduce a global UI element (like a Sidebar or Navbar) without ensuring that public or unauthenticated routes are excluded.

## 2. Core Functionality Preservation
- **Rule:** When adding a new feature, NEVER delete or modify existing core business logic unless explicitly instructed by the user.
- **Rule:** If a new feature requires modifying an existing core function, you MUST create a detailed implementation plan and ask the user for permission before touching the existing code.

## 3. Testing Mandate
- **Rule:** Any new API route or core utility function must not break existing integrations. Always double check dependencies before modifying.
