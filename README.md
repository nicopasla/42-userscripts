# 42 Userscripts
Userscripts to improve UI and UX of the 42 Intra v3

## [Userscripts](#Userscripts)

### [logtime.user.js](https://raw.githubusercontent.com/nicopasla/42-userscripts/main/logtime.user.js)

Replacement of the logtime calendar to a new one using the same data showing weekly, total hours and be more accessible or practical.

<img alt="Logtime screenshot" src="images/logtime.png" width="400"/>


- Average is calculated on active days
- Data is from `locations_stats` loaded when a profile is loaded
- Settings are stored on local storage
- Last connection status is using `locations_stats` to check when the person was last connected

### [profile.user.js](https://raw.githubusercontent.com/nicopasla/42-userscripts/main/profile.user.js)

Changed some of the CSS to make the text bigger, ability to change your profile and background profile pics locally

<img alt="Profile screenshot" src="images/profile.png" width="400"/>

- Text is bigger (Previous was super small)
- Change profile and background images by clicking your user profile pic (Local only)
- Settings (image links) are stored on local storage

### [youtube.user.js](https://raw.githubusercontent.com/nicopasla/42-userscripts/main/youtube.user.js)

Totally useless Youtube player inside Intra v3

<img alt="Youtube screenshot" src="images/youtube.png" width="400"/>

- Last Youtube video played is saved inside local storage

Could definitely be used to show cool stuff inside Intra like notes, stats,..


## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) for your browser
2. Open any userscript in the [Userscripts](#Userscripts) section by clicking the file name. Your userscript manager will prompt you to install it.

## Disclaimer
This extension is a personal project that only change the style of the website, it's purely esthetic and doesn't fetch anything.
These scripts can break anytime due to the intra code changes.
Always use at your own risks!

## License

MIT

## Changelog
<details>
<summary>logtime.user.js</summary>

### [0.1.1] - 2026-04-16

- Added close button to the settings menu

### [0.1.0] - 2026-04-14

- Added settings panel to show or hide some of the labels, change colors or change the goal hour
- Added local storage to store settings
- Added last connected label

### [0.0.4] - 2026-03-13

- Fixed percentage not going over 100%

### [0.0.3] - 2026-03-13

- Added tooltip to show remaining hours when clicking the percentage

</details>
<details>
<summary>profile.user.js</summary>

### [0.0.1] - 2026-04-16

- Added ability to change profile and background images
- Added settings and storage to keep images links
- Changed size and font of the text

</details>
