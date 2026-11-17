# Field Sales App Handover: GPS Tracking for the Sales Team (17 Nov 2026)

**What it is:** an Android app (APK, not on the Play Store) for Wayne E Solutions' field sales reps. It runs on top of the **CRM-HCM Field Service** platform. Reps check in with a selfie and GPS, the app tracks their route during duty hours, and they log client visits and leads. Managers see everything live in the CRM web app.

---

## 1. Status

| Part | Where | Status |
|---|---|---|
| Backend APIs | Wayneesolutions/CRM-HCM-Field-Service-Management-Platform-backend, [PR #6](https://github.com/Wayneesolutions/CRM-HCM-Field-Service-Management-Platform-backend/pull/6) | **Merged 17 Nov.** Needs deploy on EC2 |
| Manager dashboard | Wayneesolutions/CRM-HCM-Field-Service-Management-Platform-frontend, [PR #5](https://github.com/Wayneesolutions/CRM-HCM-Field-Service-Management-Platform-frontend/pull/5) | **Merged 17 Nov.** Needs deploy on EC2 |
| Mobile app (source) | `field-sales-app.zip` (sent with this handover) | **Not on GitHub yet.** Create a repo, e.g. `Wayneesolutions/field-sales-app` |
| APK | Built on Expo's servers (EAS) | **Not built yet.** Live URL is already in `eas.json`; run the build from a laptop (section 4) |

**Tested so far:**
- 7 new backend tests pass.
- The app type-checks and its Android bundle compiles.
- The web page builds and was checked with demo data.

**Not tested yet: the app has not been run on a real phone.** The first real-phone test (section 6) is the most important next step.

---

## 2. Features

**Mobile app (rep):**
- **Check-in:** selfie + GPS. This marks attendance for the day.
- **Duty tracking:**
  - While checked in, the route is recorded in the background, even with the app closed.
  - A point is taken every 30 s or every 25 m moved. A notification shows "On duty".
  - Tracking stops at **check-out**. The server also rejects any location sent while the rep is off duty.
- **Offline:** without internet, points are saved on the phone (up to about 2 days) and sent later in batches.
- **Visits:** "Start visit" at the client's location, add photos, then finish it with:
  - an outcome (order placed / interested / follow-up…)
  - notes, order value and a follow-up date
  - A new client can be saved as a CRM lead in one tap.
- **Leads:** the rep's own leads plus unassigned ones. Reps can call, change status, and add a lead (address filled in from GPS).
- **Me:** 7/30-day summary (days, km, visits, orders, leads). Also the battery settings shortcut.
- Order values show in the company's currency (INR, CAD…) from the CRM settings.

**Manager dashboard** (CRM web → **Field Sales Team**, `/manager/sales-team`; for admins and managers only):
- **Live tab:** a map with each rep's last position, plus who is on duty, who hasn't checked in and whose signal is lost. Updates live via Socket.IO.
- **Rep day:** that day's route on the map, the check-in selfie, and numbered visits with photos. You can step day by day.
- **Performance:** for any date range: days present, average check-in time, hours, km, visits, orders, order value, leads added and converted.
- **Visits tab:** filter by rep and outcome.

Distance (km) is worked out on the server. GPS jitter and jumps are left out.

---

## 3. Deploy the backend + dashboard (EC2 "crm-hcm-management", ap-south-1)

Both PRs are merged into `main`. Use the normal CRM deploy on the server:

1. Backend: `git pull`, `npm install`, then restart the process.
2. Frontend: `git pull`, `npm install`, `npm run build`.

Notes:
- **No new env variables.**
- Photos go to local disk in dev and to **S3 in production**, using the existing S3 settings.
- The map uses the existing `VITE_GOOGLE_MAPS_API_KEY`. Make sure it's set in the frontend env **before** building, or the map will be blank.

**Check after deploy:** send a POST to `https://crm-hcm.wayneesolutions.com/api/v1/sales/login` with an empty body. It should answer with an error message about the login details, not a 404.

---

## 4. Build the APK

What you need:
- Node 18+
- The **Expo account: wayneesolutions@gmail.com**
- Live CRM: **https://crm-hcm.wayneesolutions.com** (API: `https://crm-hcm.wayneesolutions.com/api/v1`)

```bash
unzip field-sales-app.zip && cd field-sales-app
npm install
npm install -g eas-cli
eas login       # sign in as wayneesolutions@gmail.com
eas init        # first time only: writes the project id into app.json, commit + push it
```

1. `eas.json` already points to `https://crm-hcm.wayneesolutions.com/api/v1` (both profiles). Nothing to change.
2. Build:
   ```bash
   eas build -p android --profile apk
   ```
3. The build runs on Expo's servers (about 10–15 min). You get a download link for the `.apk`. Send that link to the reps on WhatsApp.

4. The first build asks **"Generate a new Android Keystore?"**. Answer **Y**. Expo stores the key, and every later build reuses it (so updates install over the old app).
5. **After this first build, no laptop is needed.** Add a GitHub repo secret `EXPO_TOKEN` (expo.dev → Account settings → Access tokens). Then GitHub → **Actions → Build APK → Run workflow** builds a new APK, with the link in the run summary.

**App details:** name "Field Sales", package `com.wayneesolutions.fieldsales`, version 1.0.0 (versionCode 1).
**For an update:** raise `version` and `android.versionCode` in `app.config.js`, rebuild, and send the new link. Reps install it over the old app, and their login stays.

---

## 5. Set up reps and phones

**Create a rep:** CRM web → Admin → Users → role **Field Sales Rep** (`sales_rep`).
- Reps can only sign in to the app, not the office web app.
- Office staff can't sign in to the app.

**On each phone (do it with the rep, once):**
1. Install the APK. Allow "Install unknown apps" for WhatsApp or the browser when Android asks.
2. Sign in.
3. Location → **Allow all the time** (on Android 11+ the app opens Settings for this).
4. Camera → Allow.
5. Battery: in the app go to Me → **Battery settings** → set it to *Unrestricted* / *Don't optimise*.
6. **Xiaomi / Oppo / Vivo / Realme / OnePlus:** also turn on **Autostart** for the app. Without it, these phones stop tracking when the screen goes off.

Tell the team clearly: **tracking only runs between check-in and check-out.**

---

## 6. First real-phone test (checklist)

- [ ] A rep signs in, takes a selfie, and checks in. They show as "On duty" on the manager Live tab.
- [ ] Walk or drive about 1 km with the **screen off and the app closed**. The route appears in Rep day and the km look right.
- [ ] Turn mobile data off for 5 min, then on. The missing points fill in.
- [ ] Start a visit with photos, then complete it as "Order placed" with a value. It shows in the Visits tab and the order value is in the right currency.
- [ ] A new client from a visit shows up as a lead in the CRM.
- [ ] Check out. The "On duty" notification goes away and no more points arrive.
- [ ] Next day: the Performance tab shows that day's hours, km and visits.
- [ ] Repeat the screen-off test on a **Xiaomi/Oppo/Vivo** phone (most likely to fail).

---

## 7. Backend reference

**App endpoints:** `/api/v1/sales/*`. Everything except login needs role `sales_rep`.

| Method | Path | Use |
|---|---|---|
| POST | `/sales/login` | Sign in (30-day token) |
| GET | `/sales/me` | Rep + company (name, currency) |
| GET | `/sales/day/today` | Today's duty status |
| POST | `/sales/day/check-in` | Selfie + GPS check-in |
| POST | `/sales/day/check-out` | Check-out |
| POST | `/sales/location` | Batch of GPS points + battery |
| POST | `/sales/tracking-issue` | App reports location turned off or permission lost |
| GET/POST | `/sales/visits` | List / start a visit |
| PATCH | `/sales/visits/:id/complete` | Finish a visit |
| GET/POST | `/sales/leads` | List / add a lead |
| PATCH | `/sales/leads/:id/status` | Change lead status |
| GET | `/sales/summary` | 7/30-day summary |

**Manager endpoints** (in `routes/manager/managerRoute.js`): reps list, live status, rep day, team report, visits, assign lead.

**New models:** `models/sales/` (sales day, location point, visit).
**Live updates:** Socket.IO room `salesTeam:<company>` (admins and managers only).

**Changes to existing behaviour:** a lead's email and address are no longer required. `companyName`, `createdBy` and `assignedTo` were added to leads.

---

## 8. Open items

1. **Create the GitHub repo** for the app and push the zip's code. Right now the zip is the only copy.
2. **Deploy** the merged backend + frontend on EC2, with the Google Maps key set.
3. Build the APK from a laptop (section 4). The live URL is already set.
4. **Real-phone test** (section 6), especially screen-off tracking on Chinese-brand phones.
5. **Security (old code, not part of this work):** the existing technician login returns the password hash in its response. Fix it separately.
6. **Privacy:** tell the reps in writing that location is tracked only during duty hours (check-in to check-out), and get their OK.
7. **Optional later:** if this ever goes to the Play Store, Google needs a background-location declaration and a demo video. Not needed for APK distribution.
