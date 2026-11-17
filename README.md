# Field Sales — mobile app

Android app (Expo / React Native) for field sales reps, working with the CRM-HCM Field Service backend (`/api/v1/sales/*`).

What a rep does in the app:
- **Check in** with a selfie and GPS. This marks attendance.
- While checked in, the phone records the route in the background, even with the app closed. Tracking stops at **check-out**; the server also refuses location when the rep is off duty.
- **Visits:** start a visit at the client's location (new client or existing lead), take photos, then finish it with an outcome (order placed, interested, follow up…), notes, order value and a follow-up date. A walk-in client can be saved as a CRM lead in one tap.
- **Leads:** their own leads plus unassigned ones. They can search, call, change status, and add new leads (address filled in from GPS).
- **Me:** 7/30-day summary (days, km, visits, orders, leads).

If there's no internet, points are queued on the phone and sent later. Distance is worked out on the server and leaves out GPS jitter and jumps.

## Build the APK

You need an Expo account, the same one used for the HaulMind app.

```bash
npm install
npm install -g eas-cli
eas login
eas init                      # first time only; links this app to your Expo account
# Put the real CRM API URL in eas.json → build.apk.env.API_BASE_URL, e.g. https://crm.yourdomain.com/api/v1
eas build -p android --profile apk
```

The build runs on Expo's servers (about 10–15 min). At the end you get a link to download the `.apk`. Send that link to the team on WhatsApp, or install it from a laptop.

**Installing on a phone:** open the APK. Android will ask you to allow "Install unknown apps" for the browser or WhatsApp; allow it. Then open the app and sign in.

### First-time phone setup (do this with each rep)
1. Location → **Allow all the time** (the app asks; on Android 11+ it opens Settings).
2. Camera → Allow.
3. Battery: Me → **Battery settings** → set this app to *Unrestricted* / *Don't optimise*. On Xiaomi, Oppo, Vivo, Realme and OnePlus, also turn on **Autostart** for the app. Without this, these phones stop tracking when the screen is off.

## Run during development

```bash
API_BASE_URL=http://<your-laptop-ip>:3000/api/v1 npx expo start
```
Background location doesn't work in Expo Go. Use a dev build (`eas build -p android --profile apk` with a test URL) or `npx expo run:android` with Android Studio installed.

## Accounts
Reps are normal CRM users with the role **Field Sales Rep** (`sales_rep`). An admin creates them in the web app under Users. Reps can't sign in to the office web app, and office staff can't sign in to this app.
