# Submitting Decree to the App Store

Everything that can be prepared without signing in is in this repository. The steps below need your
Expo and Apple accounts, so they are run on your Mac.

## What is already in place

| Item | Where | State |
|---|---|---|
| App name, bundle ID, version 1.0.0 | `app.json` | Set (`com.coltonswabb.decree`) |
| EAS project and build profiles | `eas.json`, `app.json` | Set |
| App Store Connect app record | `eas.json` (`ascAppId`) | Created |
| Export compliance | `app.json` (`usesNonExemptEncryption: false`) | Set, so no question at upload |
| Icons, alternate icons, splash | `assets/` | Present |
| Listing text, categories, age rating | `store.config.json` | Written, not yet pushed |
| Privacy policy and support pages | `docs/privacy.md`, `docs/support.md` | Written; public once pushed |
| Typecheck, lint, production iOS bundle | | Pass |

## 1. TestFlight first

```bash
npx eas-cli@latest build -p ios --profile production --submit
```

This builds in the cloud and uploads to TestFlight. It asks you to sign in to your Apple Developer
account the first time and uses EAS build minutes. Install the build from the TestFlight app and use
it on a real phone for a few days before going further.

Things only a real device can confirm: reminders arrive at the set time, both widgets show a scroll,
changing the paper changes the app icon, and backup and restore work through the Files app.

## 2. Screenshots

Take these in the iOS Simulator (`Cmd+S` saves one) and upload them in App Store Connect. Apple needs
both sets because the app supports iPad.

| Device | Simulator | Size |
|---|---|---|
| iPhone 6.9" | iPhone 16 Pro Max or newer | 1320 x 2868 |
| iPad 13" | iPad Pro 13-inch (M4) or newer | 2064 x 2752 |

Suggested five: the shelf of scrolls; an open scroll with sections; an item being swiped done; the
Night Vigil paper; the Chronicle.

## 3. Push the listing

After the first build has been uploaded:

```bash
npx eas-cli@latest metadata:push
```

This sends `store.config.json` to App Store Connect: name, subtitle, description, keywords,
categories, age rating and the privacy and support links.

## 4. Fill in by hand in App Store Connect

- **App Privacy:** choose "Data Not Collected". The app has no accounts, analytics or server.
- **Pricing and availability:** free or paid, and which countries.
- **App Review contact:** your name, email and phone number.
- **Review notes:** paste the text below.

## 5. Submit for review

Choose the TestFlight build on the version page and press "Add for Review". Release is set to manual
with a phased rollout, so nothing goes public until you release it.

## Review notes

```
Decree is a to-do list app with no login and no in-app purchases. All data is stored on the device.

It is driven by gestures rather than buttons:
- Pull down on the first screen to create a list ("scroll"); tap one to open it.
- Inside a scroll, pull down to add an item, swipe right to complete, swipe left to delete.
- Push up from the foot of a scroll to roll it shut; "Clear struck" below it removes completed items.
- The "Read me first" scroll created on first launch lists every gesture.

Notification permission is requested only when the user adds a reminder to an item, by ending it
with a time such as "@ 5pm".

The Home Screen and Lock Screen widgets show the items of one scroll.
```

## Before you submit, decide

- **Copyright line** in `store.config.json` is "2026 Colton Swabb". Change it if the app should be
  published under a company name.
- **Privacy and support links** point at the pages in this GitHub repository. They work while the
  repository is public. If you make it private, host the two pages elsewhere and update the links.
- **Android** is configured (`com.coltonswabb.decree`) but nothing here has been prepared for Google Play.
