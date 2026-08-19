# Settings System

SKYSENSE's central configuration layer. The `/settings` page drives units,
location, refresh behaviour, alert thresholds, forecast display and the theme
for the whole app, and is the place where future ESP32 station preferences will
live.

## Status

- `SETTINGS SYSTEM: WORKING` — schema, validation, persistence and UI live and
  tested (64-check harness, all green).
- `SIMULATION: WORKING` — the station still streams simulated readings; the
  `Preferred operating mode` preference is a placeholder for future hardware.
- `ESP32: NOT CONNECTED — FUTURE HARDWARE INTEGRATION` — the Hardware section
  reports this honestly. Component identifiers are software placeholders, not
  physical part numbers.

## Architecture

```
SettingsProvider (React context)            components/SettingsProvider.tsx
        │  load / save / reset / clearLocal
        ▼
settings service                            lib/settings/service.ts
        │  merge + validate
        ▼
settings storage                            lib/settings/storage.ts
        │
        ├─ Firestore  users/{uid}/settings/app   (account, guarded by rules)
        └─ localStorage skysense.settings.{uid}  (per-user offline fallback)
```

Modules under `apps/web/src/lib/settings/`:

| File          | Responsibility |
|---------------|----------------|
| `types.ts`    | `UserSettings` schema (v1), `DEFAULT_SETTINGS`, enums, timezone list, poll-interval bounds |
| `validation.ts` | `validateSettings` — enum whitelists, coordinate bounds, poll bounds, per-metric alert thresholds, warning ≤ critical |
| `units.ts`    | presentation-only conversion (°C↔°F, km/h↔m/s↔mph, hPa↔inHg, mm↔in) + `withDisplayUnits` |
| `storage.ts`  | account (Firestore subcollection) + per-user local fallback + `SettingsPersistence` interface |
| `service.ts`  | `mergeSettings`, `getSettings`, `persistSettings`, `resetSettings`, alert-preference helpers |

Supporting pieces:

- `components/ThemeProvider.tsx` — single source of truth for `light | dark | system`,
  applied no-FOUC in `app/layout.tsx` and shared by TopBar/Sidebar/Settings.
- `components/SettingsProvider.tsx` — context that loads settings on sign-in,
  reports the source (`account | local | defaults`), and persists on save.
- Alert preferences integrate with the existing alert engine additively
  (`lib/alerts/rules.ts` → `buildRulesFromPreferences`; `lib/alerts/service.ts`
  → `evaluateAlertRulesWithPreferences` / `getAlertsSnapshotWithPreferences`).

## Schema (v1)

```ts
interface UserSettings {
  version: 1;
  general:   { timezone: IANA; dateFormat: "iso"|"short"|"long"; timeFormat: "12h"|"24h" };
  location:  { city; country; latitude; longitude; timezone };          // default Ahmedabad, India
  units:     { temperature: "c"|"f"; wind: "kmh"|"ms"|"mph"; pressure: "hpa"|"inhg"; precipitation: "mm"|"in" };
  devices:   { preferredMode: "simulation"|"live"; pollIntervalMs: 5s–600s, default 30s };
  alerts:    { enabled: boolean; preferences: { <metric>: { enabled; warningThreshold|null; criticalThreshold|null } } };
  forecast:  { horizon: "1h"|"3h"|"6h"; showConfidence; showRecommendations; showRisk; showExplanation };
  appearance: { theme: "system"|"light"|"dark" };
}
```

### Persistence

- **Account** — `users/{uid}/settings/app`, a subcollection under the existing
  user document. The current `firestore.rules` guard
  (`request.auth.uid == userId` on `users/{userId}/{document=**}`) covers it, so
  **no rules change was required** and settings are namespaced per user.
- **Fallback** — if the account store is unreachable, settings are kept in
  `localStorage` keyed `skysense.settings.{uid}`. The provider reports whether
  the last save landed in the account or only locally.
- **Defaults** — with no stored settings the app runs on `DEFAULT_SETTINGS`.
  `mergeSettings` sanitizes any stored document (legacy/partial/tampered data is
  coerced or dropped, never trusted as-is), and `persistSettings` rejects
  invalid settings before writing.

### Units

Canonical sensor values stay metric everywhere in the data layer (°C, km/h, hPa,
mm). `units.ts` converts **only at the UI boundary**; stored readings are never
re-written. `withDisplayUnits(snapshot, units)` currently applies to the Devices
page; Home/Analytics remain canonical metric (documented).

### Alert preferences

The Settings page stores rich per-metric preferences (independent warning and
critical thresholds). The alert engine consumes them via
`buildRulesFromPreferences`: a threshold equal to the default, or `null`
("auto"), reproduces the default rule **verbatim**, so a fresh preference set
produces exactly the default rules. The Alerts page uses
`getAlertsSnapshotWithPreferences` when account preferences exist and routes its
in-page editor edits through `applyAlertEditToPrefs`, keeping both pages editing
the same preferences.

### Theme

`ThemeProvider` is the single theme source of truth (backward-compatible with
the previous `localStorage["theme"]` key). The Appearance section applies the
choice instantly and the value is also saved with the account.

### Forecast

The forecast section seeds its horizon and section visibility from
`settings.forecast`. The inline horizon switcher on the AI page still overrides
for the current session.

## Security

- Settings live behind the same per-user Firestore rule as the profile — no
  rule was weakened.
- No secrets are stored in settings.
- Local fallback is per-user keyed and removable via Settings → Privacy →
  "Clear local".

## Privacy (honest status)

- The Privacy section states what is stored where and offers **Clear local
  preferences** (removes `theme`, `skysense.alerts.settings` and
  `skysense.settings.{uid}`).
- Analytics / data-collection controls are **not yet implemented** — there is no
  fake toggle; the section says so explicitly.

## Hardware (honest status)

- The station is shown as **NOT CONNECTED** with a simulated data source.
- Sensor rows display the software component identifiers from
  `lib/devices/sensors.ts` (`ESP32_TEMPERATURE_SENSOR`, …) labelled **Planned**.
  No physical wiring exists yet — see `docs/HARDWARE_INTEGRATION.md`.
- `devices.preferredMode` is a **preference only**; the real connection state is
  always data-driven on the Devices page.

## Testing

`D:\Temp\opencode\settings-test.cjs` (64 checks) covers: schema defaults,
merge/coercion of legacy and tampered data, persist/load round-trips, per-user
isolation, account→local fallback, alert-preference helpers, default-rule
reproduction, unit conversion/display, and preference-driven alert evaluation.
It uses an injected in-memory persistence and the app's own TypeScript
transpiler — no Firestore and no firebase SDK required.