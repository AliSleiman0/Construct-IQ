# QA Prompt 08 — Org Admin: Settings (All 7 Sections)

## Scope
`/admin/settings` — Profile, Address, Branding, Localization, Notifications, Security, Danger Zone sections. All form validations, API persistence, dirty state tracking.

## Prerequisites
- Logged in as `orgadmin@constructiq.com` / `Demo@1234`.
- `GET /org-settings` returns seeded default values.
- `PATCH /org-settings` available.

---

## TC-08-001: Settings Page Renders
**Steps:**
1. Navigate to `/admin/settings`.

**Expected:**
- Page loads with all 7 sections visible (in tabs, accordion, or scroll sections):
  Profile, Address, Branding, Localization, Notifications, Security, Danger Zone.
- Fields pre-populated from API response.
- No console errors.

---

## TC-08-002: Settings — API Fetch
**Steps:**
1. Open DevTools → Network, navigate to `/admin/settings`.

**Expected:**
- `GET /api/v1/org-settings` fires.
- `X-Organization-Id` header present.
- Response 200 with settings object (brandColor, theme, timezone, etc.).

---

## TC-08-003: Settings — Loading State
**Steps:**
1. Throttle network, navigate to `/admin/settings`.

**Expected:**
- Skeleton loaders or spinner shown during fetch.
- Fields populate after response.

---

## PROFILE SECTION

## TC-08-004: Profile — Display Current Values
**Steps:**
1. Observe the Profile section.

**Expected:**
- Organization name, contact email, phone, website fields shown.
- Values match what was seeded or previously saved.

---

## TC-08-005: Profile — Edit and Save
**Steps:**
1. Change the organization name to "QA Updated Name".
2. Click "Save" (or equivalent for this section).

**Expected:**
- PATCH `/api/v1/org-settings` fires with updated name.
- Success snackbar: "Settings saved" or similar.
- On page refresh, field shows "QA Updated Name".

---

## TC-08-006: Profile — Required Field Validation
**Steps:**
1. Clear the organization name field.
2. Attempt to save.

**Expected:**
- Validation error: "Organization name is required".
- No PATCH request fired.

---

## TC-08-007: Dirty State — Unsaved Changes Warning
**Steps:**
1. Change any field.
2. Attempt to navigate away (click another sidebar link).

**Expected:**
- Unsaved changes warning dialog or browser prompt: "You have unsaved changes. Leave?"
- Clicking "Cancel" stays on settings page with changes intact.
- Clicking "Leave" discards changes and navigates away.

---

## ADDRESS SECTION

## TC-08-008: Address — Edit and Save
**Steps:**
1. Fill in Street, City, Country, Postal Code.
2. Save.

**Expected:**
- PATCH fires with address fields.
- Success snackbar.
- Values persist on refresh.

---

## TC-08-009: Address — Postal Code Validation
**Steps:**
1. Enter invalid postal code format (if validation exists, e.g., letters only).
2. Save.

**Expected:**
- Validation error shown (if format-enforced) OR saved as-is (if free text).
- Document which behavior is implemented.

---

## BRANDING SECTION

## TC-08-010: Branding — Color Picker
**Steps:**
1. Open the Branding section.
2. Change the brand color using the color picker.

**Expected:**
- Color swatch updates in real time.
- Preview shows the selected color applied to a sample element.

---

## TC-08-011: Branding — Save Color
**Steps:**
1. Select a new brand color (e.g., #e53935).
2. Save.

**Expected:**
- PATCH fires with `brandColor: '#e53935'`.
- On refresh, color picker restores to #e53935.
- Application accent color (if theme-reactive) updates to the new color.

---

## TC-08-012: Branding — Invalid Hex Color
**Steps:**
1. If a text input for hex is present, enter "GGGGGG".
2. Save.

**Expected:**
- Validation error: "Invalid color format" OR field rejected server-side.
- No partial save.

---

## TC-08-013: Branding — Theme Toggle (Light/Dark)
**Steps:**
1. Toggle from Light to Dark theme.
2. Save.

**Expected:**
- PATCH fires with `theme: 'dark'`.
- Application switches to dark mode (if theme is reactive) OR saves for future sessions.

---

## LOCALIZATION SECTION

## TC-08-014: Localization — Timezone Dropdown
**Steps:**
1. Open the Timezone dropdown.

**Expected:**
- Comprehensive list of IANA timezones (at minimum: UTC, America/New_York, Europe/London, Asia/Dubai).
- Select "America/Chicago", save.
- PATCH fires with `timezone: 'America/Chicago'`.

---

## TC-08-015: Localization — Currency
**Steps:**
1. Change currency to "EUR".
2. Save.

**Expected:**
- PATCH fires with `currency: 'EUR'`.
- Budget figures on dashboard/reports show € symbol after refresh (if currency-reactive).

---

## TC-08-016: Localization — Date Format
**Steps:**
1. Change date format to "DD/MM/YYYY".
2. Save.

**Expected:**
- PATCH fires with `dateFormat: 'DD/MM/YYYY'`.
- Dates across the app update to new format on refresh (if reactive).

---

## TC-08-017: Localization — Week Start Day
**Steps:**
1. Change "Week starts on" to "Monday".
2. Save.

**Expected:**
- PATCH fires with `weekStart: 'MONDAY'` or similar enum value.
- Persists on refresh.

---

## TC-08-018: Localization — Measurement Units
**Steps:**
1. Toggle between Imperial and Metric.
2. Save.

**Expected:**
- PATCH fires with `measurement: 'METRIC'` or `'IMPERIAL'`.

---

## NOTIFICATIONS SECTION

## TC-08-019: Notifications — Toggles Render
**Steps:**
1. Open Notifications section.

**Expected:**
- Toggles for: Email Notifications, Push Notifications, Report Reminders, Budget Alerts, etc.
- Each toggle shows current state (on/off).

---

## TC-08-020: Notifications — Toggle and Save
**Steps:**
1. Toggle "Email Notifications" off.
2. Save.

**Expected:**
- PATCH fires with `notifications.email: false`.
- On refresh, toggle remains off.

---

## TC-08-021: Notifications — Bulk Toggle
**Steps:**
1. If "Disable all notifications" option exists, click it.

**Expected:**
- All notification toggles turn off.
- PATCH fires with all notification flags as false.

---

## SECURITY SECTION

## TC-08-022: Security — Two-Factor Required Toggle
**Steps:**
1. Toggle "Require 2FA for all members" on.
2. Save.

**Expected:**
- PATCH fires with `twoFactorRequired: true`.
- On refresh, toggle is on.

---

## TC-08-023: Security — Session Timeout
**Steps:**
1. Set session timeout to 30 minutes.
2. Save.

**Expected:**
- PATCH fires with `sessionTimeoutMin: 30`.
- Value within allowed range (5–1440).

---

## TC-08-024: Security — Session Timeout Validation (Out of Range)
**Steps:**
1. Set session timeout to 2 (below min of 5).
2. Save.

**Expected:**
- Validation error: "Minimum is 5 minutes".
- PATCH not fired.

---

## TC-08-025: Security — Password Policy
**Steps:**
1. Select a password policy (e.g., "Strong" requiring uppercase + number + symbol).
2. Save.

**Expected:**
- PATCH fires with updated `passwordPolicy` value.
- Persists.

---

## TC-08-026: Security — SSO Toggle
**Steps:**
1. Toggle "Enable SSO" on.
2. Save.

**Expected:**
- PATCH fires with `ssoEnabled: true`.

---

## DANGER ZONE SECTION

## TC-08-027: Danger Zone — Delete Organization Button Visible
**Steps:**
1. Scroll to Danger Zone section.

**Expected:**
- "Delete Organization" or "Transfer Ownership" button visible.
- Button styled in red / destructive styling.

---

## TC-08-028: Danger Zone — Delete Org Requires Confirmation
**Steps:**
1. Click "Delete Organization".

**Expected:**
- Confirmation dialog opens requiring user to type the org name or "DELETE".
- Submitting without correct confirmation text = disabled submit button.

---

## TC-08-029: Danger Zone — Delete Org Confirmation with Correct Text
**Steps:**
1. Type the required confirmation text.
2. Click "Confirm Delete".

**Expected:**
- DELETE request fired (or snackbar: "This action is irreversible and not available in this demo" if stubbed).
- If real: org deleted, redirect to login.
- If stubbed: snackbar shown, no deletion occurs.

---

## TC-08-030: Settings — Multiple Section Save Independence
**Steps:**
1. Change a value in Profile.
2. Change a value in Localization.
3. Save only Profile section.

**Expected:**
- Only Profile changes sent in PATCH (or full settings object sent — document which).
- Localization changes preserved in UI state.
- Save Localization separately — those changes also persist.

---

## TC-08-031: Settings — Permissions (Non-Admin Cannot Access)
**Steps:**
1. Log in as `pm@constructiq.com`.
2. Navigate to `/admin/settings`.

**Expected:**
- 403 or redirect to main dashboard.
- Settings page content not visible.
