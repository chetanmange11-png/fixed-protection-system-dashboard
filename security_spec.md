# Security Specification - Fixed Protection System

## Data Invariants
1. A **TestRecord** must reference a valid `plantId`, `subSystemId`, and `categoryId`.
2. **FinancialYear** consistency: Records must match the active year they are assigned to.
3. **Identity**: Only authorized "Admin" or "Technician" roles (simulated via presence in users collection or current session) should perform writes. Since we use anonymous auth for simplicity, we focus on schema validation and restricted field updates.

## The Dirty Dozen Payloads

1. **Identity Theft (Record spoofing)**: Creating a record with a fake `testerName` that doesn't match the current user.
2. **Path Poisoning**: Using a document ID like `../../secrets` to attempt escaping.
3. **Ghost Field Injection**: Adding `isVerified: true` to a Plant document to bypass checks.
4. **Massive Payload**: Sending a 500KB string for `plantName` to exhaust resources.
5. **Historical Forgery**: Updating `createdAt` of an old record.
6. **Status Shortcut**: Moving a `Pending` record directly to `Satisfactory` without filling `dateOfTesting`.
7. **Relational Orphan**: Creating a `SubSystem` with a `categoryId` that doesn't exist.
8. **Recycle Bin Escape**: Manually restore a document as a 'category' when it was a 'plant' to corrupt data.
9. **Settings Hijack**: Updating `adminPassword` from the client without admin privileges.
10. **Financial Year Spoofing**: Creating records for `2030-31` when it's not active.
11. **Checklist Bypass**: Submitting a record with an empty `checklist` array when it's required.
12. **PII Scraping**: Attempting to list all `users` without authentication.

## Test Runner logic (Partial)
Rules will enforce:
- `isSignedIn()`
- `isValidId(id)`
- `isValidEntity(data)`
- `affectedKeys().hasOnly(...)` for specific actions.
