# Better Jira

A Chrome extension (Manifest V3) that adds quick actions to Jira Service Desk and Slack for Superbet / Betler support work.

## Features

**Service Desk → Jira redirect**
- Links to `axilis.atlassian.net/servicedesk/customer/portal/<portal>/<TICKET-KEY>` are redirected to the standard `axilis.atlassian.net/browse/<TICKET-KEY>` view.
- Works on full page loads (via `rules.json`) and on in-app navigations (via the content script).

**Player UUIDs (Jira and Slack)**
Any player/customer UUID in the page text gets four inline actions:
- 🔗 **Copy ID**: copies the UUID to the clipboard (shows ✅ for a second).
- 🔍 **Search in Jira**: opens a Jira search for the ID in the *Product Support* project.
- 👤 **Open user**: opens the customer record in the Betler back office.
- 💰 **Finance**: opens the player's transactions in the Betler back office.

**Ticket codes (Jira only)**
- Short ticket codes (`XXXX-XXXXXX`) become red links to the Bookie ticket details page.
- The link's `target` parameter is picked from the market shown on the page (Romania, Poland, Serbia, Belgium, Brazil, Greece). If no market is detected yet, the link is updated once one is found.

## Installation

### From a release (recommended)

1. Download `better-jira-vX.Y.Z.zip` from the [Releases page](https://github.com/thedanniel-super/better-jira/releases).
2. Unzip it.
3. Open `chrome://extensions`, turn on **Developer mode**, and click **Load unpacked**.
4. Select the unzipped folder (the one containing `manifest.json`).

### From source

1. Clone this repository.
2. Follow steps 3–4 above, selecting the cloned folder.

To update, download the new release (or pull the repo) and click **Reload** on the extension card.

## Permissions and scope

The extension runs only on:
- `https://axilis.atlassian.net/*`
- `https://*.slack.com/*`

It uses `declarativeNetRequestWithHostAccess` for the redirect rule. It does not store data or make network requests of its own. All links it creates point to Jira or the Betler back office.

## Project layout

```
manifest.json   Extension manifest (MV3), content script and icon config
content.js      Content script: UUID/ticket linking, copy and search actions, SPA redirect fallback
rules.json      declarativeNetRequest rule for the servicedesk → browse redirect
icons/          Extension icons (16, 32, 48, 128 px)
```

## How it works

- `rules.json` handles the redirect on main-frame HTTP requests.
- Jira single-page navigations don't trigger network requests, so `content.js` repeats the redirect check on `popstate` and on DOM mutations.
- A `MutationObserver` watches the page. Only new or changed nodes are rescanned, with a debounce, so large pages stay responsive.
- Market detection uses `document.body.innerText`, which reflects only the visible market.

## Releasing

1. Bump `version` in `manifest.json`.
2. Create a zip of the tracked files, with `manifest.json` at the root:
   ```sh
   git archive --format=zip -o better-jira-vX.Y.Z.zip HEAD
   ```
3. Create the release:
   ```sh
   gh release create vX.Y.Z better-jira-vX.Y.Z.zip --title "Better Jira vX.Y.Z" --notes "..."
   ```

## Author

Daniel Oliveira
