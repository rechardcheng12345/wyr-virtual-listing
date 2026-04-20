# Email History Menu Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add left navigation with Virtual Listing and Email History, and persist/view email send history with purchased products.

**Architecture:** Persist send attempts in MySQL using `email_history` and `email_history_items`. The send route records `sent` or `failed` status, and a new history route exposes list/detail APIs. The React app switches between listing and history pages with local state.

**Tech Stack:** Express, mysql2, nodemailer, React, Vite, Node assert tests.

---

## Chunk 1: Backend History Persistence

### Task 1: History Data Shape

**Files:**
- Modify: `schema.sql`
- Create: `backend/src/services/emailHistory.js`
- Test: `backend/src/services/emailHistory.test.mjs`

- [ ] Write a failing Node assert test for normalizing listing rows into history items.
- [ ] Run `node backend/src/services/emailHistory.test.mjs` and confirm it fails because the module is missing.
- [ ] Create `emailHistory.js` with helpers for `buildHistoryItems`, `createEmailHistory`, and `markEmailHistoryStatus`.
- [ ] Add `email_history` and `email_history_items` tables to `schema.sql`.
- [ ] Run the helper test and confirm it passes.

### Task 2: Send Route Recording

**Files:**
- Modify: `backend/src/routes/send.js`

- [ ] Update the send route to create a pending history record after listings are loaded.
- [ ] Save selected product snapshots for each history record.
- [ ] Mark the history as `sent` after SMTP succeeds.
- [ ] Mark the history as `failed` with the error message when SMTP fails.

### Task 3: History API

**Files:**
- Create: `backend/src/routes/emailHistory.js`
- Modify: `backend/src/index.js`

- [ ] Add `GET /api/email-history` returning newest history rows.
- [ ] Add `GET /api/email-history/:id` returning one history row and its items.
- [ ] Mount the route in `backend/src/index.js`.

## Chunk 2: Frontend Navigation and History Page

### Task 4: Sidebar Navigation

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] Add `activePage` state with `virtual-listing` as default.
- [ ] Add a left sidebar with `Virtual Listing` and `Email History` buttons.
- [ ] Keep existing listing page behavior under the Virtual Listing page.

### Task 5: Email History UI

**Files:**
- Create: `frontend/src/components/EmailHistoryPage.jsx`
- Create: `frontend/src/components/EmailHistoryDetailsModal.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] Fetch `/api/email-history` when the history page loads.
- [ ] Render recipient, sent date, product count, status, and a view icon.
- [ ] Fetch `/api/email-history/:id` for the detail modal.
- [ ] Show purchased products in the detail modal.

## Chunk 3: Verification

### Task 6: Verify

**Files:**
- Test: `backend/src/services/emailHistory.test.mjs`
- Test: `frontend/src/utils/filterListings.test.mjs`

- [ ] Run `node backend/src/services/emailHistory.test.mjs`.
- [ ] Run `node frontend/src/utils/filterListings.test.mjs`.
- [ ] Run `npm run client:build`.
- [ ] Run a backend syntax/import check with `node --check` for changed backend route/service files.
