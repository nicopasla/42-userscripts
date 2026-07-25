# Changelog

## [Unreleased]

## [1.6.2] - 2026-07-25

### Features 🎉

- feat(pace): implement pace tracking feature with weekly visualization ([32a04a6](https://github.com/nicopasla/better-intra/commit/32a04a6))
- feat(transcript): add transcript configuration support for campuses ([91acf68](https://github.com/nicopasla/better-intra/commit/91acf68))
- feat(transcript): add transcript option like on the Intra v2 ([807ea55](https://github.com/nicopasla/better-intra/commit/807ea55))
- feat(cluster-dialog): add totals badge for seat occupancy display ([8774081](https://github.com/nicopasla/better-intra/commit/8774081))
- feat(friend-badge): implement friend button in profile section ([fba59d4](https://github.com/nicopasla/better-intra/commit/fba59d4))

### Bug fixes 🐛

- fix(roulette-stats): improve styling and layout of roulette stats display components ([b58efc1](https://github.com/nicopasla/better-intra/commit/b58efc1))
- fix(roulette-stats): update tooltip text for clarity and adjust success percentage threshold to 70% ([b7163b7](https://github.com/nicopasla/better-intra/commit/b7163b7))
- fix(roulette-stats): add force parameter to profile stats fetch and update tooltip text for clarity ([2762797](https://github.com/nicopasla/better-intra/commit/2762797))
- fix(transcript): ensure campus data is reloaded if not found in cache ([e4ee380](https://github.com/nicopasla/better-intra/commit/e4ee380))
- fix(transcript): integrate theme management for transcript dialog ([2bffe87](https://github.com/nicopasla/better-intra/commit/2bffe87))
- fix(marks): update svgs colors on dark mode ([223b3f1](https://github.com/nicopasla/better-intra/commit/223b3f1))
- fix(profile-card): add responsive styles for info card badges ([01e3a66](https://github.com/nicopasla/better-intra/commit/01e3a66))

### Maintenance 🧹

- chore(images): add scripts to generate and store images for Chrome Web Store ([e48661e](https://github.com/nicopasla/better-intra/commit/e48661e))

### Other Changes 🔄

- docs(readme): update cluster features and add transcript download option ([424998f](https://github.com/nicopasla/better-intra/commit/424998f))

## [1.6.1] - 2026-07-20

### Features 🎉

- feat(map-dialog): add seat count display ([6765aec](https://github.com/nicopasla/better-intra/commit/6765aec))

### Bug fixes 🐛

- fix(render-day-cell): update tooltip formatting for event display ([e80dd22](https://github.com/nicopasla/better-intra/commit/e80dd22))
- fix(render-seat-overlays): update text formatting for seat tip display ([a670951](https://github.com/nicopasla/better-intra/commit/a670951))
- fix(rankings-dialog): remove rankings dialog implementation ([c6111b3](https://github.com/nicopasla/better-intra/commit/c6111b3))
- fix(map-dialog): update text color in map area for better visibility ([a31ad0a](https://github.com/nicopasla/better-intra/commit/a31ad0a))
- fix(heatmap): correct daysDiff calculation using UTC timestamps ([e85d54b](https://github.com/nicopasla/better-intra/commit/e85d54b))
- fix(profile): improve layout for marks display ([56da1d1](https://github.com/nicopasla/better-intra/commit/56da1d1))
- fix(profile): show give-points button on modern info card ([28f17be](https://github.com/nicopasla/better-intra/commit/28f17be))
- fix(shortcuts): shortcuts not opening in new tab ([80b4c7a](https://github.com/nicopasla/better-intra/commit/80b4c7a))

## [1.6.0] - 2026-07-19

### Features 🎉

- feat(hub): add GitHub star and follower counts with SVG icons ([1c5d8dd](https://github.com/nicopasla/better-intra/commit/1c5d8dd))
- feat(profile): replace tracker card with hover popover on badge ([5d08bd2](https://github.com/nicopasla/better-intra/commit/5d08bd2))
- feat(profile): style profile personal info card and add campus flags ([4a335c3](https://github.com/nicopasla/better-intra/commit/4a335c3))
- feat(tracker): implement tracker card with mode selection and progress display ([1081813](https://github.com/nicopasla/better-intra/commit/1081813))
- feat(funding): add GitHub username for sponsorship support ([ccb77c3](https://github.com/nicopasla/better-intra/commit/ccb77c3))
- feat(footer): enhance footer with GitHub follow, star, and sponsor buttons ([e08c3d8](https://github.com/nicopasla/better-intra/commit/e08c3d8))
- feat: replace inline SVGs with imported SVG files for better maintainability ([eac79eb](https://github.com/nicopasla/better-intra/commit/eac79eb))
- feat(hub-settings): add drag to reorder functionality with visual cue ([a14d692](https://github.com/nicopasla/better-intra/commit/a14d692))
- feat(profile): add nav bar custom avatar ([bf51bf3](https://github.com/nicopasla/better-intra/commit/bf51bf3))
- feat(readme): update README with new images and overview ([3b9f1d2](https://github.com/nicopasla/better-intra/commit/3b9f1d2))
- feat(images): remove unused image assets from the project ([74f9f4a](https://github.com/nicopasla/better-intra/commit/74f9f4a))
- feat(map-dialog): refactor cluster dialog with zoom functionality ([649695b](https://github.com/nicopasla/better-intra/commit/649695b))
- feat(logtime): add heatmap calendar view ([d8cc35b](https://github.com/nicopasla/better-intra/commit/d8cc35b))
- feat(logtime): add compact calendar view ([b529e4f](https://github.com/nicopasla/better-intra/commit/b529e4f))
- feat(logtime): add full historical logtime ([c239b0e](https://github.com/nicopasla/better-intra/commit/c239b0e))
- feat(badges): implement badge fetching and initialization logic ([cb0b528](https://github.com/nicopasla/better-intra/commit/cb0b528))
- feat(belgium): add badge configuration for various roles ([3ab371b](https://github.com/nicopasla/better-intra/commit/3ab371b))
- feat(campuses): add Belgium campus configuration ([16ee8a6](https://github.com/nicopasla/better-intra/commit/16ee8a6))
- feat(evaluations): enhance sorting logic and add feedback section ([6722adf](https://github.com/nicopasla/better-intra/commit/6722adf))


### Bug fixes 🐛

- fix(profile): scope align-items center to personal info card only ([2b65232](https://github.com/nicopasla/better-intra/commit/2b65232))
- fix(roulette): update next draw label for clarity ([0425622](https://github.com/nicopasla/better-intra/commit/0425622))
- fix(hub): update radio button styles for setting controls ([4aa9cf8](https://github.com/nicopasla/better-intra/commit/4aa9cf8))
- fix(hub): update reset button icon ([4fb5738](https://github.com/nicopasla/better-intra/commit/4fb5738))
- fix(hub): refactor auto push toggle to use radio buttons for manual and auto sync options ([9e37bf5](https://github.com/nicopasla/better-intra/commit/9e37bf5))
- fix(discord): update connected status color and button styles ([5902e95](https://github.com/nicopasla/better-intra/commit/5902e95))
- fix(hub): replace auto-push swap toggle with clear label-toggle pattern ([4a16fbc](https://github.com/nicopasla/better-intra/commit/4a16fbc))
- fix(profile): adjust button padding in profile card styling ([ce66be3](https://github.com/nicopasla/better-intra/commit/ce66be3))
- fix(campus-flags): update flag insertion logic to replace SVG with flag emoji ([c0dbcad](https://github.com/nicopasla/better-intra/commit/c0dbcad))
- fix(marks): match projects sort select style ([d175613](https://github.com/nicopasla/better-intra/commit/d175613))
- fix(profile): only inject tracker card on homepage ([44a46db](https://github.com/nicopasla/better-intra/commit/44a46db))
- fix(profile): navbar avatar distortion ([6f4ac99](https://github.com/nicopasla/better-intra/commit/6f4ac99))
- fix(heatmap): update tooltip date format ([7d81c9f](https://github.com/nicopasla/better-intra/commit/7d81c9f))
- fix(profile): reset background-size/position/color when toggling to original avatar ([6758339](https://github.com/nicopasla/better-intra/commit/6758339))

## [1.5.4] - 2026-07-16

### Features 🎉

- feat(clusters): enhance cluster SVG caching and occupancy loading ([2e23972](https://github.com/nicopasla/better-intra/commit/2e23972))

### Bug fixes 🐛

- fix(rankings): remove rankings section from documentation ([cffac73](https://github.com/nicopasla/better-intra/commit/cffac73))
- fix(profile): update styles for profile badges ([0a953cc](https://github.com/nicopasla/better-intra/commit/0a953cc))
- fix(rankings): remove rankings leaderboard ([87496b2](https://github.com/nicopasla/better-intra/commit/87496b2))
- fix(rankings): remove piscine months ([fb0c74a](https://github.com/nicopasla/better-intra/commit/fb0c74a))

## [1.5.3] - 2026-07-15

### Features 🎉

- feat(account): implement cloud settings restoration and update UI on login ([4148f4f](https://github.com/nicopasla/better-intra/commit/4148f4f))
- feat(rankings-dialog): enhance ranking display with medal indicators for top ranks ([e939eb6](https://github.com/nicopasla/better-intra/commit/e939eb6))
- feat(profile): add support for banner and background color customization ([2990287](https://github.com/nicopasla/better-intra/commit/2990287))
- feat(toolbar): add button to open Intra in a new tab ([1eefe13](https://github.com/nicopasla/better-intra/commit/1eefe13))

### Bug fixes 🐛

- fix(cluster-dialog):  badge display:none ([8727a9c](https://github.com/nicopasla/better-intra/commit/8727a9c))
- fix(rankings-dialog): adjust overflow behavior and improve layout for better visibility ([eaaeedb](https://github.com/nicopasla/better-intra/commit/eaaeedb))
- fix(sort): add better-intra-sort-host for project sorting and update styles ([e4b76f2](https://github.com/nicopasla/better-intra/commit/e4b76f2))
- fix(seat-overlays): improve rotation calculation for SVG elements ([b1a3599](https://github.com/nicopasla/better-intra/commit/b1a3599))

## [1.5.2] - 2026-07-15

### Features 🎉

- feat(rankings): add rankings dialog and integrate with profile card ([b93292f](https://github.com/nicopasla/better-intra/commit/b93292f))

### Bug fixes 🐛

- fix(calendar): update instructions for adding calendar to Apple Calendar ([cc3d184](https://github.com/nicopasla/better-intra/commit/cc3d184))
- fix(calendar): remove unused sync button and associated SVG import ([6050a3f](https://github.com/nicopasla/better-intra/commit/6050a3f))
- fix(feature-defs): swap logtime and profile entries ([3421482](https://github.com/nicopasla/better-intra/commit/3421482))
- fix(avatar-editor): improve mouse drag positioning with dynamic scaling adjustments ([f0a35d4](https://github.com/nicopasla/better-intra/commit/f0a35d4))
- fix(clusters): enhance seat overlay rendering with dynamic positioning and rotation ([06041e7](https://github.com/nicopasla/better-intra/commit/06041e7))

## [1.5.1] - 2026-07-13

### Features 🎉

- feat(profile): add markers to custom clusters dialog ([7ae5c48](https://github.com/nicopasla/better-intra/commit/7ae5c48))
- feat(clusters): implement cluster dialog ([aed57d1](https://github.com/nicopasla/better-intra/commit/aed57d1))
- feat(clusters): add option to open user profiles in new tab from clusters map ([b912fa4](https://github.com/nicopasla/better-intra/commit/b912fa4))
- feat(friends): add customizable avatar properties for enhanced user experience ([bfa36be](https://github.com/nicopasla/better-intra/commit/bfa36be))
- feat(profile): add avatar customization options including position and scale ([a3e192e](https://github.com/nicopasla/better-intra/commit/a3e192e))

### Bug fixes 🐛

- fix(profile): adjust layout styles for profile modal to improve responsiveness ([b40fc16](https://github.com/nicopasla/better-intra/commit/b40fc16))

## [1.5.0] - 2026-07-12

### Features 🎉

- feat(friends): add friend button with shadow DOM and shared styles ([d6ffb9c](https://github.com/nicopasla/better-intra/commit/d6ffb9c))
- feat: implement caching for event types data retrieval ([bcb9df9](https://github.com/nicopasla/better-intra/commit/bcb9df9))
- feat: update campus data structure and event types integration ([f18c8ff](https://github.com/nicopasla/better-intra/commit/f18c8ff))
- feat: update export to include timestamp ([1042a96](https://github.com/nicopasla/better-intra/commit/1042a96))
- feat(account): implement auto push functionality ([073a2be](https://github.com/nicopasla/better-intra/commit/073a2be))
- feat: implement campus detection ([e094053](https://github.com/nicopasla/better-intra/commit/e094053))
- feat(theme): add new themes: soap, citrus, and neon ([750f88d](https://github.com/nicopasla/better-intra/commit/750f88d))
- feat(campus): implement campus data management and UI components ([b646e2b](https://github.com/nicopasla/better-intra/commit/b646e2b))
- feat(clusters): add campus detection and configuration options ([3dd32d1](https://github.com/nicopasla/better-intra/commit/3dd32d1))
- feat(advancedSettings): add export, import, and reset actions ([1283eee](https://github.com/nicopasla/better-intra/commit/1283eee))
- feat(advancedSettings): add option to open links in new tab and implement related UI changes ([3886720](https://github.com/nicopasla/better-intra/commit/3886720))
- feat(profile): add light themes ([ea1e04c](https://github.com/nicopasla/better-intra/commit/ea1e04c))

### Bug fixes 🐛

- fix(docs): update feature descriptions and privacy policy for clarity and accuracy ([18a727b](https://github.com/nicopasla/better-intra/commit/18a727b))
- fix(api): update WORKER_URL and host_permissions to use api.betterintra.com ([5a4fdee](https://github.com/nicopasla/better-intra/commit/5a4fdee))
- fix(account): update syncToCloud to store last sync timestamp on success ([0a6603b](https://github.com/nicopasla/better-intra/commit/0a6603b))
- fix(visuals): prevent visual updates when profile modal is open and reset original avatar state ([f3545be](https://github.com/nicopasla/better-intra/commit/f3545be))
- fix(profile): update background mode retrieval to use checked input ([69d5749](https://github.com/nicopasla/better-intra/commit/69d5749))
- fix(profile): add styles for profile header badges ([12fa18e](https://github.com/nicopasla/better-intra/commit/12fa18e))
- fix: restore event types configuration in data directory ([1b7b049](https://github.com/nicopasla/better-intra/commit/1b7b049))
- fix: update WORKER_URL to remove trailing slash ([769037d](https://github.com/nicopasla/better-intra/commit/769037d))
- fix(event_types): correct keywords for meet up event type ([58ffdd6](https://github.com/nicopasla/better-intra/commit/58ffdd6))
- fix(hubSettings): rename theme ([8f3f406](https://github.com/nicopasla/better-intra/commit/8f3f406))
- fix(theme): improve theme application logic for non-v3 environments ([af264c8](https://github.com/nicopasla/better-intra/commit/af264c8))
- fix(event_types): correct keywords for meet up event type ([2f48b3d](https://github.com/nicopasla/better-intra/commit/2f48b3d))
- fix(event_types): remove redundant sun event type ([653c4ab](https://github.com/nicopasla/better-intra/commit/653c4ab))
- fix(events): add show all ([39cb9e2](https://github.com/nicopasla/better-intra/commit/39cb9e2))
- fix(popup): change background color of popup root to white for better visibility ([c71d9ec](https://github.com/nicopasla/better-intra/commit/c71d9ec))
- fix(hubSettings): update button text color for better visibility ([a31f3b3](https://github.com/nicopasla/better-intra/commit/a31f3b3))
- fix(logtime): ensure correct date formatting for event grouping and rendering ([d207d1f](https://github.com/nicopasla/better-intra/commit/d207d1f))

### Maintenance 🧹

- chore(campuses): add cluster configuration files for Amman, Antananarivo, Gyeongsan, and Kocaeli ([7d4eb78](https://github.com/nicopasla/better-intra/commit/7d4eb78))
- chore: move donation information to Support section in README ([8dee62c](https://github.com/nicopasla/better-intra/commit/8dee62c))
- chore: update worker URL to new domain ([f58812e](https://github.com/nicopasla/better-intra/commit/f58812e))
- chore(package): add allowScripts configuration for fsevents ([d4b28c2](https://github.com/nicopasla/better-intra/commit/d4b28c2))

### Other Changes 🔄

- refactor(profile): remove PROFILE_SLOTS_REDIRECTION and update related logic ([caaffbb](https://github.com/nicopasla/better-intra/commit/caaffbb))
- refactor: remove CLUSTERS_CAMPUS_AUTO from configuration ([dc726ac](https://github.com/nicopasla/better-intra/commit/dc726ac))
- Create CNAME ([ae4aa53](https://github.com/nicopasla/better-intra/commit/ae4aa53))
- Delete CNAME ([bd40f80](https://github.com/nicopasla/better-intra/commit/bd40f80))
- Create CNAME ([c0703c1](https://github.com/nicopasla/better-intra/commit/c0703c1))
- docs(README): add donation information and support link ([449f347](https://github.com/nicopasla/better-intra/commit/449f347))
- Add Ko-fi username to FUNDING.yml ([844f9ac](https://github.com/nicopasla/better-intra/commit/844f9ac))

## [1.4.1] - 2026-07-09

### Features 🎉

- feat(profile): add avatar decoration option ([478b1c7](https://github.com/nicopasla/better-intra/commit/478b1c7))
- feat(profile): add avatar background color configuration ([fc8f1a3](https://github.com/nicopasla/better-intra/commit/fc8f1a3))
- feat(logtime): add event start time to tooltip ([5a02346](https://github.com/nicopasla/better-intra/commit/5a02346))
- feat(roulette): enhance UI for roulette stats and evaluations ([9b3bd32](https://github.com/nicopasla/better-intra/commit/9b3bd32))

### Bug fixes 🐛

- fix(calendar): add calendar sync token and events hash to configuration ([b948a6b](https://github.com/nicopasla/better-intra/commit/b948a6b))
- fix(logtime): adjust day-cell hover effect and enhance tooltip styling ([428cedf](https://github.com/nicopasla/better-intra/commit/428cedf))
- fix(logtime): improve day-cell hover effects and tooltip positioning ([edd02d7](https://github.com/nicopasla/better-intra/commit/edd02d7))

### Maintenance 🧹

- chore(docs): update README ([bf3aca3](https://github.com/nicopasla/better-intra/commit/bf3aca3))
- chore(docs): update CHROME_LISTING ([5980220](https://github.com/nicopasla/better-intra/commit/5980220))

## [1.4.0] - 2026-07-09

### Features 🎉

- feat(calendar): add QR code for calendar subscription ([753c3a5](https://github.com/nicopasla/better-intra/commit/753c3a5))
- feat: add calendar sync with ICS subscription ([a9c6d5e](https://github.com/nicopasla/better-intra/commit/a9c6d5e))
- feat(logtime): show subscribed events in logtime calendar ([99621d9](https://github.com/nicopasla/better-intra/commit/99621d9))
- feat(profile): add project badges ([de40b50](https://github.com/nicopasla/better-intra/commit/de40b50))
- feat: add evaluation stats ([ce22c78](https://github.com/nicopasla/better-intra/commit/ce22c78))

### Bug fixes 🐛

- fix(logtime): show calendar before laoding events ([e552cca](https://github.com/nicopasla/better-intra/commit/e552cca))
- fix(config): add missing cloud config keys ([33e3535](https://github.com/nicopasla/better-intra/commit/33e3535))

## [1.3.2] - 2026-07-07

### Features 🎉

- feat(svg): update SVG assets and remove unused icons ([48e0559](https://github.com/nicopasla/better-intra/commit/48e0559))

### Bug fixes 🐛

- fix(about): update color classes and improve layout for better UI/UX ([d1e2e92](https://github.com/nicopasla/better-intra/commit/d1e2e92))
- fix(profile): prevent unnecessary updates during profile initialization ([e49a2e2](https://github.com/nicopasla/better-intra/commit/e49a2e2))
- fix(profile): improve marks fetching and enhance existing marks functionality ([fb5b73d](https://github.com/nicopasla/better-intra/commit/fb5b73d))

### Other Changes 🔄

- refactor(account): remove sync toggle functionality and clean up related code ([627b46a](https://github.com/nicopasla/better-intra/commit/627b46a))
- refactor(hub): auto-save hub settings locally, replace Save & Reload with Reload ([6808bf6](https://github.com/nicopasla/better-intra/commit/6808bf6))

## [1.3.1] - 2026-07-06

### Features 🎉

- feat(profile): add shortcut buttons for quick access to user-related links ([14574e4](https://github.com/nicopasla/better-intra/commit/14574e4))
- feat(roulette): embed roulette inside PROJECTS card on other profiles ([48d56ac](https://github.com/nicopasla/better-intra/commit/48d56ac))

### Bug fixes 🐛

- fix(profile): refactor profile initialization ([34d59bb](https://github.com/nicopasla/better-intra/commit/34d59bb))
- fix(profile): streamline seat badge styling and layout adjustments ([093432f](https://github.com/nicopasla/better-intra/commit/093432f))
- fix(profile): update badge styles for improved theming and consistency ([634fea7](https://github.com/nicopasla/better-intra/commit/634fea7))
- fix(profile): enhance badge population logic for stats polling ([69897e6](https://github.com/nicopasla/better-intra/commit/69897e6))
- fix(profile): adjust layout for pisciners with only wallet and evaluations points ([b10d2a4](https://github.com/nicopasla/better-intra/commit/b10d2a4))
- fix(images): update logtime and profile images ([70db934](https://github.com/nicopasla/better-intra/commit/70db934))

### Maintenance 🧹

- chore(docs): remove outdated image files ([41d35fb](https://github.com/nicopasla/better-intra/commit/41d35fb))

## [1.3.0] - 2026-07-06

### Features 🎉

- feat(discord): redesign discord ui settings panel ([72172d5](https://github.com/nicopasla/better-intra/commit/72172d5))
- feat(profile): add option to disable new info card ([419a9bd](https://github.com/nicopasla/better-intra/commit/419a9bd))
- feat(profile): redesign the bar under the level ([9a70ebd](https://github.com/nicopasla/better-intra/commit/9a70ebd))
- feat(theme): add 13 themes to customize profile ([70c9cfa](https://github.com/nicopasla/better-intra/commit/70c9cfa))
- feat(profile): open shop link when clicking money badge ([dfd95da](https://github.com/nicopasla/better-intra/commit/dfd95da))

### Bug fixes 🐛

- fix(profile): remove wave effect ([ff22c2a](https://github.com/nicopasla/better-intra/commit/ff22c2a))
- fix(logtime): remove wave effect ([0f2c47a](https://github.com/nicopasla/better-intra/commit/0f2c47a))
- fix(profile): dropdown menu background ([4fbe652](https://github.com/nicopasla/better-intra/commit/4fbe652))
- fix(visuals): wait for intra to load ([87bac78](https://github.com/nicopasla/better-intra/commit/87bac78))
- fix(config): add 'correction' option to FRIENDS_SORT_MODE ([10b7604](https://github.com/nicopasla/better-intra/commit/10b7604))
- fix(profile): increase font size for profile card header percentage ([11f4d3e](https://github.com/nicopasla/better-intra/commit/11f4d3e))
- fix(profile): update seat badge styling to prevent text overflow ([c32c482](https://github.com/nicopasla/better-intra/commit/c32c482))
- fix(profile): adjust badge padding and update badge insertion order ([936cb85](https://github.com/nicopasla/better-intra/commit/936cb85))
- fix(profile): remove redundant background style from badge ([f846c6b](https://github.com/nicopasla/better-intra/commit/f846c6b))
- fix(profile): enhance seat badge functionality and styling ([519a5b1](https://github.com/nicopasla/better-intra/commit/519a5b1))
- fix(profile): update seat badge styling ([428019a](https://github.com/nicopasla/better-intra/commit/428019a))

### Maintenance 🧹

- chore(vite): remove warnings ([badcd83](https://github.com/nicopasla/better-intra/commit/badcd83))
- chore(release): update version to 1.3.0 ([7bd075d](https://github.com/nicopasla/better-intra/commit/7bd075d))
  
  
### Other Changes 🔄

- docs(nav): improve navigation styling for better responsiveness and overflow handling ([f91e4e2](https://github.com/nicopasla/better-intra/commit/f91e4e2))
- docs(CHROME_LISTING): enhance profile section with theme presets and update cloud sync instructions ([ec98a12](https://github.com/nicopasla/better-intra/commit/ec98a12))
- docs(README): update profile features and settings sections for clarity and detail ([bd14bdc](https://github.com/nicopasla/better-intra/commit/bd14bdc))
- docs(privacy): update caching method for friend user IDs and online status ([2c2cedd](https://github.com/nicopasla/better-intra/commit/2c2cedd))

## [1.2.5] - 2026-06-29

### Features 🎉

- feat(milestones): update design for finished milestones ([d119252](https://github.com/nicopasla/better-intra/commit/d119252))
- feat(friends): udpate medals ([8417b98](https://github.com/nicopasla/better-intra/commit/8417b98))

### Bug fixes 🐛

- fix(milestones): remove overflow ([ccbf6ca](https://github.com/nicopasla/better-intra/commit/ccbf6ca))
- fix(marks): fetch new outstanding when count change ([40c0739](https://github.com/nicopasla/better-intra/commit/40c0739))
- fix(evaluations): add another phrasing ([bc72906](https://github.com/nicopasla/better-intra/commit/bc72906))
- fix(discord): change how discord is enabled ([7477b17](https://github.com/nicopasla/better-intra/commit/7477b17))

## [1.2.4] - 2026-06-28

### Features 🎉

- feat(discord): 42 API health check when testing ([288121a](https://github.com/nicopasla/better-intra/commit/288121a))
- feat(profile): custom achievements card ([3dc4f79](https://github.com/nicopasla/better-intra/commit/3dc4f79))
- feat(profile): add pending evaluations card with sort toggle ([d28c84b](https://github.com/nicopasla/better-intra/commit/d28c84b))
- feat(account): broken token detection, alerts, and reconnect flow ([8f8a651](https://github.com/nicopasla/better-intra/commit/8f8a651))
- feat(friends): show broken token warning on friends button ([e721951](https://github.com/nicopasla/better-intra/commit/e721951))
- feat: show v2 warning banner on old profile homepage ([af3a566](https://github.com/nicopasla/better-intra/commit/af3a566))
- feat(friends): show custom profile avatars in friends list with click-to-toggle ([515ddda](https://github.com/nicopasla/better-intra/commit/515ddda))

### Bug fixes 🐛

- fix(discord): store discord quiet hours timezone ([ba85705](https://github.com/nicopasla/better-intra/commit/ba85705))
- fix(layout): restrict card reordering to own profile ([3f6e7ff](https://github.com/nicopasla/better-intra/commit/3f6e7ff))
- fix(profile): fix achievements card layout ([1052e4d](https://github.com/nicopasla/better-intra/commit/1052e4d))
- fix(marks): re-apply enhancement on tab switch-back ([1ca171a](https://github.com/nicopasla/better-intra/commit/1ca171a))
- fix(account): await onSuccess callback and retry settings fetch after reconnect ([b6508cb](https://github.com/nicopasla/better-intra/commit/b6508cb))
- fix: formattting roulette countdown ([82d17ed](https://github.com/nicopasla/better-intra/commit/82d17ed))

### Maintenance 🧹

- chore(docs): fix changelog link ([46ad5aa](https://github.com/nicopasla/better-intra/commit/46ad5aa))
- chore(docs): repo to github icon ([11daaf1](https://github.com/nicopasla/better-intra/commit/11daaf1))
- chore(docs): add changelog ([015068b](https://github.com/nicopasla/better-intra/commit/015068b))
- chore: add robots.txt ([baec1cb](https://github.com/nicopasla/better-intra/commit/baec1cb))
- chore: add google search meta tag ([a14ba8c](https://github.com/nicopasla/better-intra/commit/a14ba8c))
- chore: update PRIVACY ([618fe5f](https://github.com/nicopasla/better-intra/commit/618fe5f))

## [1.2.3] - 2026-06-21

### Features 🎉

- feat(marks): precise date sorting, absolute date display, and layout restructure ([ab0916d](https://github.com/nicopasla/better-intra/commit/ab0916d))
- feat(marks): show outstanding stars on other profiles and cache locally ([9cbf554](https://github.com/nicopasla/better-intra/commit/9cbf554))
- feat(discord): added quiet hours settings ([a339137](https://github.com/nicopasla/better-intra/commit/a339137))
- feat(profile): add Thursday Roulette card with live countdown ([8ac56cb](https://github.com/nicopasla/better-intra/commit/8ac56cb))

### Bug fixes 🐛

- fix(evaluations): remove broken browser notifications ([de47a06](https://github.com/nicopasla/better-intra/commit/de47a06))

### Maintenance 🧹

- chore(docs): update README ([b7d3022](https://github.com/nicopasla/better-intra/commit/b7d3022))
- chore: update subproject commit reference in better-intra-worker ([be265fd](https://github.com/nicopasla/better-intra/commit/be265fd))
- chore: update subproject commit reference in better-intra-worker ([219e174](https://github.com/nicopasla/better-intra/commit/219e174))

## [1.2.2] - 2026-06-18

### Features 🎉

- feat(marks): show outstanding project stars ([ae4fbdd](https://github.com/nicopasla/better-intra/commit/ae4fbdd))
- feat(marks): use dynamic cursus ID from profile-v3 dropdown instead of hardcoded 21 ([5e8de90](https://github.com/nicopasla/better-intra/commit/5e8de90))

### Bug fixes 🐛

- fix(marks): only show ongoing projects when there some ([ef8a99f](https://github.com/nicopasla/better-intra/commit/ef8a99f))

## [1.2.1] - 2026-06-17

### Features 🎉

- feat(profile): add projects sort dropdown with toggleable name/date ordering ([8aacf31](https://github.com/nicopasla/better-intra/commit/8aacf31))
- feat(profile): replace moulinette image on project pages with custom robot icons ([ea554d0](https://github.com/nicopasla/better-intra/commit/ea554d0))
- feat(profile): redirect per-project defense subscription links to the correct slots page ([2e8b460](https://github.com/nicopasla/better-intra/commit/2e8b460))

### Bug fixes 🐛

- fix(visuals): show other user's theme colors and logtime emojis even when they have no custom images ([3501825](https://github.com/nicopasla/better-intra/commit/3501825))

### Maintenance 🧹

- chore: update CHROME_LISTING ([2320b3b](https://github.com/nicopasla/better-intra/commit/2320b3b))
- chore: update AGENTS ([a954310](https://github.com/nicopasla/better-intra/commit/a954310))

## [1.2.0] - 2026-06-16

### Features 🎉

- feat: centralized css import via shared-styles.ts ([3bce0f8](https://github.com/nicopasla/better-intra/commit/3bce0f8))
- feat: added tests files ([729a437](https://github.com/nicopasla/better-intra/commit/729a437))
- feat: added dark theme to the evaluations points dialog ([b0c0c13](https://github.com/nicopasla/better-intra/commit/b0c0c13))
- feat: added freeze info on profile ([16f05f2](https://github.com/nicopasla/better-intra/commit/16f05f2))
- feat: added evaluations notifications ([c68133e](https://github.com/nicopasla/better-intra/commit/c68133e))
- feat: add pages docs ([43d37e7](https://github.com/nicopasla/better-intra/commit/43d37e7))
- feat(marks) change where date is displayed ([3605aa2](https://github.com/nicopasla/better-intra/commit/3605aa2))
- feat(marks): add sorting setting ([03baa17](https://github.com/nicopasla/better-intra/commit/03baa17))
- feat(visuals): add cache for images ([c3dfdff](https://github.com/nicopasla/better-intra/commit/c3dfdff))
- feat(hub): add cloud disabled visuals ([d83fb7b](https://github.com/nicopasla/better-intra/commit/d83fb7b))
- feat(discord): add connect to discord button with OAuth2 ([42da46e](https://github.com/nicopasla/better-intra/commit/42da46e))
- feat(evaluations): add browser test notifications ([15d64aa](https://github.com/nicopasla/better-intra/commit/15d64aa))

### Bug fixes 🐛

- fix(background): norme ([7011c92](https://github.com/nicopasla/better-intra/commit/7011c92))
- fix(visuals): norme ([429deb8](https://github.com/nicopasla/better-intra/commit/429deb8))
- fix(freeze): remove TS issues ([564225c](https://github.com/nicopasla/better-intra/commit/564225c))
- fix(config): add DATA_CACHE ([f4e33d2](https://github.com/nicopasla/better-intra/commit/f4e33d2))
- fix(logtime): add config guard ([d49902b](https://github.com/nicopasla/better-intra/commit/d49902b))
- fix(visuals): background disappearing ([80b8fc2](https://github.com/nicopasla/better-intra/commit/80b8fc2))
- fix(freeze, marks): remove cached sessionStorage value ([fc171cd](https://github.com/nicopasla/better-intra/commit/fc171cd))
- fix(logtime): load listener leak ([fa87dc5](https://github.com/nicopasla/better-intra/commit/fa87dc5))
- fix(freeze): add console warn ([2c302e5](https://github.com/nicopasla/better-intra/commit/2c302e5))
- fix(account, config): whitelist instead of blacklist keys ([1a9abe2](https://github.com/nicopasla/better-intra/commit/1a9abe2))
- fix(clusters): remove redundant bodyObserver ([7e4ed8a](https://github.com/nicopasla/better-intra/commit/7e4ed8a))
- fix(package): change chrome watch to the proper folder ([f04e435](https://github.com/nicopasla/better-intra/commit/f04e435))
- fix(manifests): host_permissions with trailing slash ([4c6a323](https://github.com/nicopasla/better-intra/commit/4c6a323))
- fix(main): strips token from URL ([78cbaab](https://github.com/nicopasla/better-intra/commit/78cbaab))
- fix(visuals): stale fetch guard with fetchLogin ([8e86014](https://github.com/nicopasla/better-intra/commit/8e86014))
- fix(background): add console warn for catch blocks ([de69a4c](https://github.com/nicopasla/better-intra/commit/de69a4c))
- fix(milestone): fix memory leak ([e00d587](https://github.com/nicopasla/better-intra/commit/e00d587))
- fix(marks): remove permanent initialized flag ([de6b562](https://github.com/nicopasla/better-intra/commit/de6b562))
- fix(freeze, marks): TOCTOU race with token event ([62b8a9b](https://github.com/nicopasla/better-intra/commit/62b8a9b))
- fix(clusters, hub): cleanup intervals and observers on pagehide ([50b747e](https://github.com/nicopasla/better-intra/commit/50b747e))
- fix(main): isolate feature init errors so one failure doesn't block others ([6f757c1](https://github.com/nicopasla/better-intra/commit/6f757c1))
- fix(config): guard auto-JSON-parse and fix hub storage format ([3fbf06d](https://github.com/nicopasla/better-intra/commit/3fbf06d))
- fix(visuals): reset isFetching after cloud fetch completes or fails ([478ef16](https://github.com/nicopasla/better-intra/commit/478ef16))
- fix(background): guard against native array corruption ([4a1fe0f](https://github.com/nicopasla/better-intra/commit/4a1fe0f))
- fix: avatar loading timeout ([dab89ca](https://github.com/nicopasla/better-intra/commit/dab89ca))
- fix: hovering in the dropdown menu ([29a854c](https://github.com/nicopasla/better-intra/commit/29a854c))
- fix: remove glow effect ([8d20135](https://github.com/nicopasla/better-intra/commit/8d20135))
- fix: add button not appearing on certain profiles ([c992f2a](https://github.com/nicopasla/better-intra/commit/c992f2a))
- fix: marks font size ([9599bc4](https://github.com/nicopasla/better-intra/commit/9599bc4))
- fix(hub): fix disabled states for disabled functions ([3e8d106](https://github.com/nicopasla/better-intra/commit/3e8d106))
- fix(shortcuts): MultationObserver was not firing up ([252b4fd](https://github.com/nicopasla/better-intra/commit/252b4fd))
- fix: Discord card ui styling ([a8a0aff](https://github.com/nicopasla/better-intra/commit/a8a0aff))
- fix(logtime): show 'No data' for days with no data ([2198a29](https://github.com/nicopasla/better-intra/commit/2198a29))
- fix(hub): remove greyout content when enabling function ([51b5a4b](https://github.com/nicopasla/better-intra/commit/51b5a4b))
- fix(discord): show status on the left of the button ([d9c85fc](https://github.com/nicopasla/better-intra/commit/d9c85fc))
- fix(discord): remove old config and show full discordId ([82ee9b8](https://github.com/nicopasla/better-intra/commit/82ee9b8))
- fix(marks): format date correctly ([5185311](https://github.com/nicopasla/better-intra/commit/5185311))

### Maintenance 🧹

- chore(release): update version to 1.2.0 ([d2c85c3](https://github.com/nicopasla/better-intra/commit/d2c85c3))
- chore: update dependencies ([68642fe](https://github.com/nicopasla/better-intra/commit/68642fe))
- chore: update subproject commit reference in better-intra-worker ([c44b7e6](https://github.com/nicopasla/better-intra/commit/c44b7e6))
- chore(crypto): export hashLogin to a new file ([83c221a](https://github.com/nicopasla/better-intra/commit/83c221a))
- chore(selectors): constants replace 13 inline litterals ([d52b9b4](https://github.com/nicopasla/better-intra/commit/d52b9b4))
- chore(tests): new tests for marks ([39a3c17](https://github.com/nicopasla/better-intra/commit/39a3c17))
- chore(tests): setup tests ([8e6dcc7](https://github.com/nicopasla/better-intra/commit/8e6dcc7))
- chore(marks): refactor to multiple helpers ([6bf8a62](https://github.com/nicopasla/better-intra/commit/6bf8a62))
- chore: update AGENTS ([527438c](https://github.com/nicopasla/better-intra/commit/527438c), [bff1447](https://github.com/nicopasla/better-intra/commit/bff1447), [7eab396](https://github.com/nicopasla/better-intra/commit/7eab396), [7361c40](https://github.com/nicopasla/better-intra/commit/7361c40))
- chore: change evaluations default ([a8d338c](https://github.com/nicopasla/better-intra/commit/a8d338c))
- chore: update README ([528e152](https://github.com/nicopasla/better-intra/commit/528e152), [581f441](https://github.com/nicopasla/better-intra/commit/581f441))
- chore: update PRIVACY ([9c59593](https://github.com/nicopasla/better-intra/commit/9c59593))
- chore: update DEVELOPMENT ([9716c80](https://github.com/nicopasla/better-intra/commit/9716c80))
- chore: add CHROME_LISTING ([949444f](https://github.com/nicopasla/better-intra/commit/949444f))
- chore: remove old import ([72bfe37](https://github.com/nicopasla/better-intra/commit/72bfe37))
- chore: remove as_evaluated ([de6c724](https://github.com/nicopasla/better-intra/commit/de6c724))
- chore: remove dead code ([7b9c487](https://github.com/nicopasla/better-intra/commit/7b9c487))
- chore(discord): add discord warning for auto-join server ([4a89b74](https://github.com/nicopasla/better-intra/commit/4a89b74))

### Other Changes 🔄

- docs: title and releases tab ([08e31a3](https://github.com/nicopasla/better-intra/commit/08e31a3))
- docs: footer and more plugins ([1e29742](https://github.com/nicopasla/better-intra/commit/1e29742))
- docs: add repo link and make images open ([9b78adb](https://github.com/nicopasla/better-intra/commit/9b78adb))
- docs: update theme ([838fa75](https://github.com/nicopasla/better-intra/commit/838fa75))
- docs: render github page from root ([d27a629](https://github.com/nicopasla/better-intra/commit/d27a629))
- docs: switch to Jekyll ([dd41815](https://github.com/nicopasla/better-intra/commit/dd41815))
- chore: migrate inner html to lit ([91e7240](https://github.com/nicopasla/better-intra/commit/91e7240))

## [1.1.5] - 2026-06-11

### Bug fixes 🐛

- fix: fix overflow of the select button ([4ba94cc](https://github.com/nicopasla/better-intra/commit/4ba94cc))
- fix: remove inner.html ([499db39](https://github.com/nicopasla/better-intra/commit/499db39))

### Maintenance 🧹

- chore: change back action to v2 ([0728e3a](https://github.com/nicopasla/better-intra/commit/0728e3a))
- chore: specified timeout for action ([47883d0](https://github.com/nicopasla/better-intra/commit/47883d0))

## [1.1.4] - 2026-06-10

### Features 🎉

- feat: new option to hide the friends feature ([c576da0](https://github.com/nicopasla/better-intra/commit/c576da0))
- feat: add medals to top levels friends ([c94c519](https://github.com/nicopasla/better-intra/commit/c94c519))
- feat: make the friends button bigger ([620e43c](https://github.com/nicopasla/better-intra/commit/620e43c))
- feat: added add friend button ([013a6b1](https://github.com/nicopasla/better-intra/commit/013a6b1))
- feat: bigger marks section and grid for ongoing projects ([3438b4c](https://github.com/nicopasla/better-intra/commit/3438b4c))

### Bug fixes 🐛

- fix: fixed dropdown filter style ([025260a](https://github.com/nicopasla/better-intra/commit/025260a))
- fix: updateUI was blocked by the friends fetch await ([ea06799](https://github.com/nicopasla/better-intra/commit/ea06799))

## [1.1.3] - 2026-06-09

### Features 🎉

- feat: added marks finished projects inside the projects card ([2f40b23](https://github.com/nicopasla/better-intra/commit/2f40b23))

### Bug fixes 🐛

- fix: revert timeout for shortcuts ([a0a80ce](https://github.com/nicopasla/better-intra/commit/a0a80ce))

### Maintenance 🧹

- chore: proper organization of some features ([6a2107c](https://github.com/nicopasla/better-intra/commit/6a2107c))

## [1.1.2] - 2026-06-08

### Features 🎉

- feat: updated events filtering ([2beeefe](https://github.com/nicopasla/better-intra/commit/2beeefe))
- feat: option to hide the 'Important links' ([64654cf](https://github.com/nicopasla/better-intra/commit/64654cf))

### Bug fixes 🐛

- fix: removed FRIENDS_DATA_CACHE from being push to the  KV ([53cbabb](https://github.com/nicopasla/better-intra/commit/53cbabb))
- fix: updated description of the friends feature ([aa9cd3d](https://github.com/nicopasla/better-intra/commit/aa9cd3d))
- fix: emoji limit in logtime was fixed to only one emoji ([bd88626](https://github.com/nicopasla/better-intra/commit/bd88626))
- fix: updated color for the select event button ([66d2cf8](https://github.com/nicopasla/better-intra/commit/66d2cf8))
- fix: added some top/bottom padding to the shortcuts ([0de5ca7](https://github.com/nicopasla/better-intra/commit/0de5ca7))
- fix: hide shortcuts seperator when there 0 shortcuts ([989154b](https://github.com/nicopasla/better-intra/commit/989154b))
- fix: changed formating of last active timestamp ([1a747ae](https://github.com/nicopasla/better-intra/commit/1a747ae))
- fix: added back colored links ([db21be7](https://github.com/nicopasla/better-intra/commit/db21be7))

### Maintenance 🧹

- chore: update subproject commit reference in better-intra-worker ([456139b](https://github.com/nicopasla/better-intra/commit/456139b))
- chore: improve clusters buttons layout ([1a7a89c](https://github.com/nicopasla/better-intra/commit/1a7a89c))
- chore: formatting ([f39d57f](https://github.com/nicopasla/better-intra/commit/f39d57f))

## [1.1.1] - 2026-06-08

### Features 🎉

- feat: add drag and drop to the shortcuts section ([96b6227](https://github.com/nicopasla/better-intra/commit/96b6227))
- feat: auto-pull of friends and settings after connection ([5f529a7](https://github.com/nicopasla/better-intra/commit/5f529a7))
- feat: added Chrome Web Store link ([b5e6d91](https://github.com/nicopasla/better-intra/commit/b5e6d91))
- feat: updated light mode ([d0a9c19](https://github.com/nicopasla/better-intra/commit/d0a9c19))
- feat: add reconnect flow and add connect button to the friends panel ([9a1cc0f](https://github.com/nicopasla/better-intra/commit/9a1cc0f))
- feat: add local cache and last active connection label ([45d5500](https://github.com/nicopasla/better-intra/commit/45d5500))

### Bug fixes 🐛

- fix: layout not working after changes in logtime ([1e4d814](https://github.com/nicopasla/better-intra/commit/1e4d814))
- fix: updated colors for the level ([98a8adf](https://github.com/nicopasla/better-intra/commit/98a8adf))
- fix: render colors differently for dark theme ([6ff3641](https://github.com/nicopasla/better-intra/commit/6ff3641))
- fix: the personnal color was used for others profile percentage ([53696c5](https://github.com/nicopasla/better-intra/commit/53696c5))
- fix: change badges style ([d9f4115](https://github.com/nicopasla/better-intra/commit/d9f4115))
- fix: project button hovering ([27b49f8](https://github.com/nicopasla/better-intra/commit/27b49f8))
- fix: change apparence of delete button and add confirmation prompt ([294a0e7](https://github.com/nicopasla/better-intra/commit/294a0e7))
- fix: update svg selector ([19eb8c0](https://github.com/nicopasla/better-intra/commit/19eb8c0))
- fix: fill empty clusters posts dark ([b34f2ad](https://github.com/nicopasla/better-intra/commit/b34f2ad))
- fix: theme was not applying to the friends panel ([21f5873](https://github.com/nicopasla/better-intra/commit/21f5873))
- fix: update default card order ([63c5810](https://github.com/nicopasla/better-intra/commit/63c5810))
- fix: update hover color for buttons and inputs ([7bad8c5](https://github.com/nicopasla/better-intra/commit/7bad8c5))
- fix: update milestone selector ([f958760](https://github.com/nicopasla/better-intra/commit/f958760))
- fix: remove borders around elements ([286dc57](https://github.com/nicopasla/better-intra/commit/286dc57))

### Maintenance 🧹

- chore: update subproject commit reference in better-intra-worker ([6c17eae](https://github.com/nicopasla/better-intra/commit/6c17eae))
- chore: add new drag and drop to the README ([3b4d17b](https://github.com/nicopasla/better-intra/commit/3b4d17b))
- chore: update profile modal ([02c56d6](https://github.com/nicopasla/better-intra/commit/02c56d6))
- chore: remove friends and account screenshot section ([b24fb8f](https://github.com/nicopasla/better-intra/commit/b24fb8f))
- chore: update README to latest features ([1187975](https://github.com/nicopasla/better-intra/commit/1187975))
- chore: remove outdated images ([71317d4](https://github.com/nicopasla/better-intra/commit/71317d4))
- chore: update subproject commit reference in better-intra-worker ([2051b0d](https://github.com/nicopasla/better-intra/commit/2051b0d))
- chore: add images fro Chrome store ([e879cf0](https://github.com/nicopasla/better-intra/commit/e879cf0))
- chore: update description of manifests ([81283dc](https://github.com/nicopasla/better-intra/commit/81283dc))
- chore: add STORE_LISTING for Chrome listing ([e19dda1](https://github.com/nicopasla/better-intra/commit/e19dda1))
- chore: add PRIVACY file ([43d315b](https://github.com/nicopasla/better-intra/commit/43d315b))
- chore: add DEVELOPMENT file ([5b124e0](https://github.com/nicopasla/better-intra/commit/5b124e0))
- chore: add AGENTS file ([31b4f94](https://github.com/nicopasla/better-intra/commit/31b4f94))

### Other Changes 🔄

- refactor(hub): upgrade settings hub layout ([2c9fb8e](https://github.com/nicopasla/better-intra/commit/2c9fb8e))
- refactor(logtime): migrated some parts of logtime to Daisyui ([de08ee7](https://github.com/nicopasla/better-intra/commit/de08ee7))

## [1.1.0] - 2026-06-04

### Features 🎉

- feat: add new friends menu to track your friends stats ([23427fe](https://github.com/nicopasla/better-intra/commit/23427fe))
- feat: add new icon menu for the account settings ([836973b](https://github.com/nicopasla/better-intra/commit/836973b))
- feat: add basic icon ([4c0a89c](https://github.com/nicopasla/better-intra/commit/4c0a89c))
- feat: add pool month ([2b79117](https://github.com/nicopasla/better-intra/commit/2b79117))

### Bug fixes 🐛

- fix: update old daisyui var ([1d02eec](https://github.com/nicopasla/better-intra/commit/1d02eec))
- fix: remove friends cache ([aea2e98](https://github.com/nicopasla/better-intra/commit/aea2e98))
- fix: updated rainbow animations to be less catchy ([3d0c5e5](https://github.com/nicopasla/better-intra/commit/3d0c5e5))
- fix: input focus after adding a friend ([5a03782](https://github.com/nicopasla/better-intra/commit/5a03782))
- fix: remove console log and add pollTimer ([b7b1cc3](https://github.com/nicopasla/better-intra/commit/b7b1cc3))
- fix: export only once INTRA_FONT ([aee447c](https://github.com/nicopasla/better-intra/commit/aee447c))
- fix: refactor to fix ts issues ([25534a9](https://github.com/nicopasla/better-intra/commit/25534a9))
- fix: remove console log ([2e76d45](https://github.com/nicopasla/better-intra/commit/2e76d45))
- fix: remove strict type errors ([f95f19f](https://github.com/nicopasla/better-intra/commit/f95f19f))
- fix: add console errors when syncMyVisuals fail ([71cf18b](https://github.com/nicopasla/better-intra/commit/71cf18b))
- fix: improve observer in profile main ([f20a139](https://github.com/nicopasla/better-intra/commit/f20a139))

### Maintenance 🧹

- chore: remove account tab ([532fa08](https://github.com/nicopasla/better-intra/commit/532fa08))
- chore: remove tests ([2b46c3f](https://github.com/nicopasla/better-intra/commit/2b46c3f))
- chore: remove handleTestConnection ([17a1a5d](https://github.com/nicopasla/better-intra/commit/17a1a5d))
- chore: refactor shortcut export ([82efc6c](https://github.com/nicopasla/better-intra/commit/82efc6c))
- chore: refactor and delete testing functions ([b1a5f80](https://github.com/nicopasla/better-intra/commit/b1a5f80))
- chore: remove background.ts ([4b11b7d](https://github.com/nicopasla/better-intra/commit/4b11b7d))

## [1.0.9] - 2026-06-03

### Features 🎉

- feat: changed dark mode color ([b526d8b](https://github.com/nicopasla/better-intra/commit/b526d8b))
- feat: improve Chrome and Firefox builds ([11abc21](https://github.com/nicopasla/better-intra/commit/11abc21))

### Bug fixes 🐛

- fix: change config to use boolean instead of true ([ac68878](https://github.com/nicopasla/better-intra/commit/ac68878))
- fix: rename js imports to ts imports ([c0d77f3](https://github.com/nicopasla/better-intra/commit/c0d77f3))
- fix: remove duplicate config call ([f46c8a4](https://github.com/nicopasla/better-intra/commit/f46c8a4))
- fix: remove text-shadow from elements with inline styles ([4dcbd33](https://github.com/nicopasla/better-intra/commit/4dcbd33))
- 
### Maintenance 🧹

- chore: remove alternative layout ([2fc4db9](https://github.com/nicopasla/better-intra/commit/2fc4db9))
- chore: Bump concurrently from ^9.2.1 to ^10.0.0 ([23b5fb7](https://github.com/nicopasla/better-intra/commit/23b5fb7))

## [1.0.8] - 2026-05-29

### Bug fixes 🐛

- fix(theme-manager): clean up code formatting and remove unnecessary whitespace ([a487b5a](https://github.com/nicopasla/better-intra/commit/a487b5a))
- fix(theme-v2): fix cluster layout and remove unused CSS rules ([bce5abb](https://github.com/nicopasla/better-intra/commit/bce5abb))
- fix(theme-manager): correct variable casing for theme imports ([f9fdcc8](https://github.com/nicopasla/better-intra/commit/f9fdcc8))

### Maintenance 🧹

- chore(docs): update README ([e80493b](https://github.com/nicopasla/better-intra/commit/e80493b))

### Other Changes 🔄

- docs: add Intra v2 dark mode feature reference to README ([b9f6b7f](https://github.com/nicopasla/better-intra/commit/b9f6b7f))

## [1.0.7] - 2026-05-27

### Features 🎉

- feat: implement dark mode ([3fa719a](https://github.com/nicopasla/better-intra/commit/3fa719a))

### Bug fixes 🐛

- fix(profile-card): update progress bar styling to hide wave when progress is 0 ([ac01671](https://github.com/nicopasla/better-intra/commit/ac01671))

## [1.0.6] - 2026-05-27

### Features 🎉

- feat(profile): add option to use custom color on profile card ([0aa21c5](https://github.com/nicopasla/better-intra/commit/0aa21c5))
- feat(profile-card): add custom styling and theme application for profile card ([a05cfbb](https://github.com/nicopasla/better-intra/commit/a05cfbb))
- feat(logtime): add new fetched visuals for other profiles ([b255237](https://github.com/nicopasla/better-intra/commit/b255237))
- feat(render): implement capping logic ([b02c43e](https://github.com/nicopasla/better-intra/commit/b02c43e))
- feat(milestones): enhance milestone styles with improved gradients and shadows ([1780b41](https://github.com/nicopasla/better-intra/commit/1780b41))
- feat(hubSettings): implement cloud sync functionality and update save button states ([f8ae016](https://github.com/nicopasla/better-intra/commit/f8ae016))
- feat(account): add sync toggle and update button states in account tab ([2f356ad](https://github.com/nicopasla/better-intra/commit/2f356ad))
- feat(account): add optional success callback to loginWith42 function ([3aac664](https://github.com/nicopasla/better-intra/commit/3aac664))

### Bug fixes 🐛

- fix(logtime-settings): change orders of two options ([42aad6c](https://github.com/nicopasla/better-intra/commit/42aad6c))
- fix(hub-settings): update input field styling and placeholder, adjust maxlength to improve user experience ([7b98dc5](https://github.com/nicopasla/better-intra/commit/7b98dc5))

### Maintenance 🧹

- chore(account): enhance account tab layout and styling with improved card designs and action buttons ([c1dbd1b](https://github.com/nicopasla/better-intra/commit/c1dbd1b))
- chore(about-panel): enhance layout and styling of the about panel with new action links and improved tech stack presentation ([89c3eaa](https://github.com/nicopasla/better-intra/commit/89c3eaa))
- chore(clusters): update overrides for row positions in Belgium clusters ([8934e99](https://github.com/nicopasla/better-intra/commit/8934e99))
- chore: update subproject commit reference in better-intra-worker ([5738919](https://github.com/nicopasla/better-intra/commit/5738919))
- chore(about): add web-ext version to about panel and update vite config ([4357cc1](https://github.com/nicopasla/better-intra/commit/4357cc1))
- chore: update subproject commit reference in better-intra-worker ([6e48db0](https://github.com/nicopasla/better-intra/commit/6e48db0))
- chore: update dependencies in package.json and package-lock.json ([78b74c1](https://github.com/nicopasla/better-intra/commit/78b74c1))

### Other Changes 🔄

- refactor(highlight): enhance structure and readability of highlight logic and style injection ([ad53b78](https://github.com/nicopasla/better-intra/commit/ad53b78))
- refactor(account): simplify account tab rendering and enhance UI layout ([0d59447](https://github.com/nicopasla/better-intra/commit/0d59447))
- refactor(main): streamline feature initialization by using a mapping approach ([3f35e37](https://github.com/nicopasla/better-intra/commit/3f35e37))
- refactor(clusters): modularize cluster handling by separating DOM and UI logic ([28ed341](https://github.com/nicopasla/better-intra/commit/28ed341))
- refactor(account): refactor account management with improved state handling and modular handlers ([c75af7a](https://github.com/nicopasla/better-intra/commit/c75af7a))
- refactor(config): restructure configuration management and enhance type safety ([4a2e052](https://github.com/nicopasla/better-intra/commit/4a2e052))
- refactor(logtime): Split logtime feature into separate modules ([effa28c](https://github.com/nicopasla/better-intra/commit/effa28c))

## [1.0.5] - 2026-05-21

### Features 🎉

- feat(shortcuts): add separator styling to shortcuts display for improved layout ([4463049](https://github.com/nicopasla/better-intra/commit/4463049))
- feat(shortcuts): add emoji support to shortcut links and enhance rendering ([2a1f6c7](https://github.com/nicopasla/better-intra/commit/2a1f6c7))
- feat(milestones): add milestone animations and styles to enhance profile visuals ([256e507](https://github.com/nicopasla/better-intra/commit/256e507))

### Bug fixes 🐛

- fix(profile): update placeholder text and translate alignment labels in modal ([dc1b2d8](https://github.com/nicopasla/better-intra/commit/dc1b2d8))
- fix(milestones): remove not used CSS ([d14a719](https://github.com/nicopasla/better-intra/commit/d14a719))
- fix(milestones): refactor animation function and improve milestone enhancement logic ([a898912](https://github.com/nicopasla/better-intra/commit/a898912))
- fix(logtime): improve log slider behavior and enhance scroll functionality ([66bf033](https://github.com/nicopasla/better-intra/commit/66bf033))
- fix(visuals): enhance text styles for better readability in profile section ([401dbdf](https://github.com/nicopasla/better-intra/commit/401dbdf))
- fix(manifest): ensure incognito mode is set to not allowed ([df97180](https://github.com/nicopasla/better-intra/commit/df97180))
- fix(publish): move Chrome artifact to the root directory ([b9f7291](https://github.com/nicopasla/better-intra/commit/b9f7291))

### Maintenance 🧹

- chore(hubSettings): update description for logtime average display setting ([da0960c](https://github.com/nicopasla/better-intra/commit/da0960c))

## [1.0.4] - 2026-05-20

### Bug fixes 🐛

- fix(hubSettings): prevent event propagation on setting control interactions ([4a00930](https://github.com/nicopasla/better-intra/commit/4a00930))
- fix(logtime): implement fetch hook in separate hook.js file ([7109a19](https://github.com/nicopasla/better-intra/commit/7109a19))

### Maintenance 🧹

- chore: update daisyui version to 5.5.20 ([460c9ae](https://github.com/nicopasla/better-intra/commit/460c9ae))

### Other Changes 🔄

- refactor(publish.yaml): separate web-ext build steps for Firefox and Chrome ([a260a2b](https://github.com/nicopasla/better-intra/commit/a260a2b))
- refactor(package.json): add Brave browser support for development scripts ([6a9b67b](https://github.com/nicopasla/better-intra/commit/6a9b67b))
- refactor(events): integrate Belgium event data and optimize filter logic ([4e1afb2](https://github.com/nicopasla/better-intra/commit/4e1afb2))
- refactor(clusters): integrate Belgium cluster definitions and refactor screen building logic ([6258906](https://github.com/nicopasla/better-intra/commit/6258906))
- refactor(hubSettings): update cluster setting to use select input with options ([c0a202d](https://github.com/nicopasla/better-intra/commit/c0a202d))
- refactor(hubSettings): enhance number input handling with euro suffix and improve select option comparison ([c71e216](https://github.com/nicopasla/better-intra/commit/c71e216))
- refactor(logtime): improve scroll handling and CSS properties for better performance ([6680392](https://github.com/nicopasla/better-intra/commit/6680392))
- refactor: migrate storage API from Firefox to Chrome ([4f58f66](https://github.com/nicopasla/better-intra/commit/4f58f66))
- refactor(games): remove Flagle game integration code ([5ce51de](https://github.com/nicopasla/better-intra/commit/5ce51de))
- refactor(scripts): separate web-ext commands for Firefox and Chrome ([2fa7641](https://github.com/nicopasla/better-intra/commit/2fa7641))
- refactor: migrate storage API from Firefox to Chrome ([c86b983](https://github.com/nicopasla/better-intra/commit/c86b983))


## [1.0.3] - 2026-05-19

### Features 🎉

- feat(profile): add drag-and-drop card ordering UI and layout configuration ([bf8ad75](https://github.com/nicopasla/better-intra/commit/bf8ad75))

### Bug fixes 🐛

- fix(hub): update modal dimensions to be responsive and full-width ([788d794](https://github.com/nicopasla/better-intra/commit/788d794))
- fix(shortcuts): add fallback icon for shortcut links on image load error ([39da338](https://github.com/nicopasla/better-intra/commit/39da338))

### Other Changes 🔄

- refactor(profile): remove 'Hide achievements' setting and update layout configuration ([892e10d](https://github.com/nicopasla/better-intra/commit/892e10d))

## [1.0.2] - 2026-05-18

### Features 🎉

- feat(profile): add alternative layout and hide achievements options ([3cef0e9](https://github.com/nicopasla/better-intra/commit/3cef0e9))
- feat(profile): add banner and background mode options ([2a80d24](https://github.com/nicopasla/better-intra/commit/2a80d24))

### Bug fixes 🐛

- fix(logtime): refine CSS selectors for logtime components ([91670b0](https://github.com/nicopasla/better-intra/commit/91670b0))
- fix(docs): update clone command in README and remove zipping instruction ([1bd69db](https://github.com/nicopasla/better-intra/commit/1bd69db))
- fix(publish): update artifact handling in GitHub Actions workflow ([8c54cf7](https://github.com/nicopasla/better-intra/commit/8c54cf7))

### Maintenance 🧹

- chore(shortcuts): update display styles for shortcut links and improve layout ([8d4daa9](https://github.com/nicopasla/better-intra/commit/8d4daa9))

## [1.0.1] - 2026-05-17

### Features 🎉

- feat(publish): add GitHub Actions workflow for building and publishing releases ([10f11cd](https://github.com/nicopasla/better-intra/commit/10f11cd))
- feat(account): implement login hashing for enhanced security ([d98553f](https://github.com/nicopasla/better-intra/commit/d98553f))

### Bug fixes 🐛

- fix(highlight): update style import and formatting for consistency ([c7a9850](https://github.com/nicopasla/better-intra/commit/c7a9850))
- fix(account): update API endpoints for cloud settings and visuals ([0afa0b3](https://github.com/nicopasla/better-intra/commit/0afa0b3))
- fix(package): update version to 1.0.1 ([b01eafd](https://github.com/nicopasla/better-intra/commit/b01eafd))

## [1.0.0] - 2026-05-17

### Features 🎉

- feat(about): add About panel with technical stack information and SVG icons ([665aa9c](https://github.com/nicopasla/better-intra/commit/665aa9c))
- feat(account): integrate 42 logo SVG and update button styles ([19a5259](https://github.com/nicopasla/better-intra/commit/19a5259))
- feat(hub): add GitHub SVG icon to hub settings modal ([2ca6bac](https://github.com/nicopasla/better-intra/commit/2ca6bac))
- feat(account): enhance button states for push, pull, and test connection actions ([3024960](https://github.com/nicopasla/better-intra/commit/3024960))
- feat(profile): add arrow share icon and migrate to lit ([4fadc7c](https://github.com/nicopasla/better-intra/commit/4fadc7c))
- feat(profile): implement seat highlighting ([6c0be0a](https://github.com/nicopasla/better-intra/commit/6c0be0a))
- feat(clusters): enhance cluster picker with tooltip and improve rendering logic ([471501e](https://github.com/nicopasla/better-intra/commit/471501e))
- feat(events): enhance event filter UI with improved styling and functionality ([5fd1bb4](https://github.com/nicopasla/better-intra/commit/5fd1bb4))
- feat(account): refactor login handling to use cloud login and enhance connection checks ([76ab606](https://github.com/nicopasla/better-intra/commit/76ab606))
- feat(account): enhance cloud synchronization with token management using oAuth from 42 ([d3b6e1c](https://github.com/nicopasla/better-intra/commit/d3b6e1c))
- feat(logtime): refactor fetch hook to use event listener for stats extraction ([9a5ab24](https://github.com/nicopasla/better-intra/commit/9a5ab24))

### Bug fixes 🐛

- fix(manifest): update strict minimum version for Gecko settings to 140.0 ([949ef80](https://github.com/nicopasla/better-intra/commit/949ef80))
- fix(shortcuts): update shortcuts display integration and styling ([de3cdb2](https://github.com/nicopasla/better-intra/commit/de3cdb2))
- fix(manifest): remove redundant match pattern for content scripts ([3bfb6e1](https://github.com/nicopasla/better-intra/commit/3bfb6e1))
- fix(clusters): add type annotations for cluster dimensions ([c9bbe72](https://github.com/nicopasla/better-intra/commit/c9bbe72))
- fix(account): improve 42 authentication handling with message listener and remove polling ([04bcfe5](https://github.com/nicopasla/better-intra/commit/04bcfe5))
- fix(profile): correct avatar opacity handling in updateVisuals function ([d7e2ead](https://github.com/nicopasla/better-intra/commit/d7e2ead))

### Maintenance 🧹

- chore(manifest): update extension ID and add update URL; add updates.json for version management ([b497345](https://github.com/nicopasla/better-intra/commit/b497345))
- chore(docs): add new account connection image and update existing account image ([d4b73e7](https://github.com/nicopasla/better-intra/commit/d4b73e7))
- chore(svg): update settings gear icon ([1f82973](https://github.com/nicopasla/better-intra/commit/1f82973))
- chore: remove GitHub Actions build workflow ([a6ad81b](https://github.com/nicopasla/better-intra/commit/a6ad81b))
- chore(profile): refactor event handling and remove unused profile styles ([accbc08](https://github.com/nicopasla/better-intra/commit/accbc08))
- chore: update dependencies to latest versions ([99b21b8](https://github.com/nicopasla/better-intra/commit/99b21b8))

### Other Changes 🔄

- refactor: migrate entire project from Userscript to standalone Firefox Extension ([5119ec6](https://github.com/nicopasla/better-intra/commit/5119ec6))


## [0.1.0] - 2026-05-13

### Features 🎉

- feat(logtime): add emoji customization and related settings for logtime feature ([829f9f1](https://github.com/nicopasla/better-intra/commit/829f9f1))
- feat(shortcuts): add favicon retrieval and enhance shortcut row UI ([56347ca](https://github.com/nicopasla/better-intra/commit/56347ca))
- feat(shortcuts): add shortcuts feature with UI for managing links ([73492e4](https://github.com/nicopasla/better-intra/commit/73492e4))

### Bug fixes 🐛

- fix(visuals): refine avatar selector to include specific dimensions ([3207100](https://github.com/nicopasla/better-intra/commit/3207100))

### Maintenance 🧹

- chore: Bump version to 0.1.0 and update changelog ([d233063](https://github.com/nicopasla/better-intra/commit/d233063))
- chore(refactor): Migrate from innerHTML to lit-html templates ([e05b07d](https://github.com/nicopasla/better-intra/commit/e05b07d))

### Other Changes 🔄

- refactor(hub): enhance styling and button sizes in hub modal ([61e9112](https://github.com/nicopasla/better-intra/commit/61e9112))
- refactor(clusters): consolidate configuration management and remove utility functions ([3d7d18d](https://github.com/nicopasla/better-intra/commit/3d7d18d))

## [0.0.4] - 2026-05-11

### Bug fixes 🐛

- fix(hub): improve modal header styling and version display ([cbb7171](https://github.com/nicopasla/better-intra/commit/cbb7171))
- fix(logtime): enhance liquid-fill styles and manage past state animations ([63e1878](https://github.com/nicopasla/better-intra/commit/63e1878))

## [0.0.3] - 2026-05-11

### Bug fixes 🐛

- fix(logtime): update fetch hook to support unsafeWindow and ensure proper initialization ([8e54b88](https://github.com/nicopasla/better-intra/commit/8e54b88))

## [0.0.2] - 2026-05-11

### Features 🎉

- feat(hub): update icons and add theme toggle functionality ([cd7f7ca](https://github.com/nicopasla/better-intra/commit/cd7f7ca))
- feat(profile): Rename background variable for consistency and clarity ([d792b01](https://github.com/nicopasla/better-intra/commit/d792b01))
- feat(profile): Make the username font size bigger ([fa119c2](https://github.com/nicopasla/better-intra/commit/fa119c2))
- feat: Add userscript description ([60ece35](https://github.com/nicopasla/better-intra/commit/60ece35))

### Bug fixes 🐛

- fix(logtime): Prevent multiple initializations and optimize resource fetching ([1447068](https://github.com/nicopasla/better-intra/commit/1447068))
- fix(profile): Add findSlotsButton function to manage slots redirection ([80e1694](https://github.com/nicopasla/better-intra/commit/80e1694))
- fix(profile): Adjust font size and improve code readability ([8c54397](https://github.com/nicopasla/better-intra/commit/8c54397))

### Maintenance 🧹

- chore: Add paths to build triggers for push and pull_request ([a324ac0](https://github.com/nicopasla/better-intra/commit/a324ac0))
- chore: Add GitHub Actions workflow for release drafting ([0797d22](https://github.com/nicopasla/better-intra/commit/0797d22))
- chore(profile): Refactor profile visuals ([8aa3ff8](https://github.com/nicopasla/better-intra/commit/8aa3ff8))
- chore: Update README ([773a0f2](https://github.com/nicopasla/better-intra/commit/773a0f2))

[unreleased]: https://github.com/nicopasla/better-intra/compare/v1.6.2...HEAD
[1.6.2]: https://github.com/nicopasla/better-intra/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/nicopasla/better-intra/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/nicopasla/better-intra/compare/v1.5.4...v1.6.0
[1.5.4]: https://github.com/nicopasla/better-intra/compare/v1.5.3...v1.5.4
[1.5.3]: https://github.com/nicopasla/better-intra/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/nicopasla/better-intra/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/nicopasla/better-intra/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/nicopasla/better-intra/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/nicopasla/better-intra/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/nicopasla/better-intra/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/nicopasla/better-intra/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/nicopasla/better-intra/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/nicopasla/better-intra/compare/v1.2.5...v1.3.0
[1.2.5]: https://github.com/nicopasla/better-intra/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/nicopasla/better-intra/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/nicopasla/better-intra/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/nicopasla/better-intra/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/nicopasla/better-intra/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/nicopasla/better-intra/compare/v1.1.5...v1.2.0
[1.1.5]: https://github.com/nicopasla/better-intra/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/nicopasla/better-intra/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/nicopasla/better-intra/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/nicopasla/better-intra/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/nicopasla/better-intra/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/nicopasla/better-intra/compare/v1.0.9...v1.1.0
[1.0.9]: https://github.com/nicopasla/better-intra/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/nicopasla/better-intra/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/nicopasla/better-intra/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/nicopasla/better-intra/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/nicopasla/better-intra/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/nicopasla/better-intra/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/nicopasla/better-intra/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/nicopasla/better-intra/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/nicopasla/better-intra/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/nicopasla/better-intra/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/nicopasla/better-intra/compare/v0.0.4...v0.1.0
[0.0.4]: https://github.com/nicopasla/better-intra/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/nicopasla/better-intra/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/nicopasla/better-intra/compare/v0.0.1...v0.0.2


**Full Changelog:** https://github.com/nicopasla/better-intra/compare/v0.0.1...HEAD
