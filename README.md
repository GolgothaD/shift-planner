# Shift Planner

A planner for people whose work schedule changes every week. It protects sleep and commute time around your shifts, including overnight ones, then fits your tasks into the free time. Live at https://golgothad.github.io/shift-planner/

Data is kept in the browser's localStorage: `sp` holds the app data, `spTheme` the chosen theme, and `spUpdated` the time of the last change.

## Shift import link
Open `https://golgothad.github.io/shift-planner/#import=<base64url JSON>`

JSON format:
```json
{"shifts":[{"date":"2026-10-23","start":"06:00","end":"11:00"}]}
```
- `date` is `YYYY-MM-DD`. `start` and `end` are 24-hour `HH:MM` in the device's local time (Eastern for Toothless).
- If `end` is earlier than or equal to `start`, the shift runs overnight into the next day.
- The JSON is encoded as UTF-8, then base64url (`-` and `_`, padding optional).
- The app lists the shifts and asks you to confirm. It adds them, skips exact duplicates (same date, start and end), then clears the hash.

Example (Python): `base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")`

## .ics import
On the Sync tab, use **Import .ics**. Each VEVENT's DTSTART and DTEND become a shift, with the same duplicate check. Times ending in `Z` are converted to local time, and other times are read as local.

## Device sync
- **Sync link / QR** (Sync tab): `#sync=<lz-string compressToEncodedURIComponent of {"v":1,"sp":...,"theme":...,"t":ms}>`. Opening it asks whether to **Merge** or **Replace**.
- **Backup file**: the same JSON payload as a download, which you can import again.
- **Google Drive auto-sync** (optional): set `GOOGLE_CLIENT_ID` in index.html to an OAuth *Web* client ID. The app stores `shift-planner.json` in the Drive appDataFolder (scope `drive.appdata`). It syncs when the app opens and about 3 seconds after each change, and the newer copy wins (last write wins, using the `t` timestamp). The button stays hidden until the ID is set.
