# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate
- Location: e2e\auth.setup.ts:6:6

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "A Anuvaad" [ref=e5] [cursor=pointer]:
      - /url: /
      - generic [ref=e6]: A
      - generic [ref=e7]: Anuvaad
    - generic [ref=e8]:
      - heading "Sign in" [level=1] [ref=e9]
      - paragraph [ref=e10]: Welcome back. Sign in to continue.
      - generic [ref=e11]:
        - button "Continue with Google" [ref=e12]:
          - img
          - text: Continue with Google
        - button "Continue with GitHub" [ref=e13]:
          - img
          - text: Continue with GitHub
      - generic [ref=e14]:
        - separator [ref=e15]
        - generic [ref=e16]: or
      - generic [ref=e17]:
        - generic [ref=e18]:
          - text: Email
          - textbox "you@example.com" [ref=e19]: test_user@example.com
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Password
            - link "Forgot password?" [ref=e23] [cursor=pointer]:
              - /url: /forgot-password
          - textbox "••••••••" [ref=e24]: password123
        - paragraph [ref=e25]: Invalid login credentials
        - button "Sign In" [ref=e26]
      - paragraph [ref=e27]:
        - text: Don't have an account?
        - link "Sign Up" [ref=e28] [cursor=pointer]:
          - /url: /signup
    - paragraph [ref=e29]:
      - text: By continuing, you agree to our
      - link "Terms" [ref=e30] [cursor=pointer]:
        - /url: /terms
      - text: and
      - link "Privacy Policy" [ref=e31] [cursor=pointer]:
        - /url: /privacy
      - text: .
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e37] [cursor=pointer]:
    - img [ref=e38]
  - alert [ref=e41]
```

# Test source

```ts
  1  | import { test as setup, expect } from '@playwright/test';
  2  | import * as path from 'path';
  3  | 
  4  | const authFile = path.join(__dirname, '../playwright/.auth/user.json');
  5  | 
  6  | setup('authenticate', async ({ page }) => {
  7  |   // Use environment variables for test credentials
  8  |   const email = process.env.PLAYWRIGHT_TEST_EMAIL || 'test_user@example.com';
  9  |   const password = process.env.PLAYWRIGHT_TEST_PASSWORD || 'password123';
  10 | 
  11 |   await page.goto('/signin');
  12 |   
  13 |   // Wait for the sign in form to load and fill credentials
  14 |   await page.fill('input[type="email"]', email);
  15 |   await page.fill('input[type="password"]', password);
  16 |   
  17 |   // Click sign in button
  18 |   await page.click('button:has-text("Sign In")');
  19 |   
  20 |   // Wait until the dashboard loads to confirm successful login
> 21 |   await page.waitForURL('/dashboard');
     |              ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  22 |   
  23 |   // End of authentication steps.
  24 |   await page.context().storageState({ path: authFile });
  25 | });
  26 | 
```