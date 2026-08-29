# Better Intra — Campus Data

## How to add your campus

1. Find your campus ID from the [campus list](https://meta.intra.42.fr/clusters)
2. Create a `{name-slug}.json` file using the lowercase-hyphenated campus name (e.g., `belgium.json`, `le-havre.json`)
3. If you also need badge support, add `badgeBaseUrl` and `badges` fields
4. Update `campuses.json` to include your campus — the `name` field determines the filename
5. Submit a pull request

Seat definitions can be added later — start with just `"definitions": {}`.

## File structure

```
campuses/
├── README.md
├── campuses.json          Campus list (id → name mapping)
├── belgium.json
├── le-havre.json
└── ...
```

## campuses.json format

```json
{
  "campuses": [
    { "id": "12", "name": "Belgium", "timezone": "Europe/Brussels" },
    { "id": "67", "name": "Warsaw", "timezone": "Europe/Warsaw" }
  ]
}
```

- `id` — numeric campus ID from the 42 API (as a string)
- `name` — display name, determines the cluster filename (`{lowercase-hyphenated}.json`)
- `timezone` *(optional)* — IANA time zone (e.g. `"Europe/Paris"`); used to show the current campus-local time in the cluster map campus picker

## {name-slug}.json format

```json
{
  "clusters": [
    { "id": "20", "name": "shi" },
    { "id": "21", "name": "fu" }
  ],
  "definitions": {
    "shi": {
      "rows": [
        { "range": "r1-r5", "pos": [1, 3, 5], "dir": "UP" }
      ],
      "manual": [
        { "row": "r6", "pos": [1, 2, 3], "dir": "DOWN" }
      ],
      "overrides": {
        "r1-p2": "LEFT"
      }
    }
  }
}
```

- `transcripts[]` *(optional)* — available transcript configurations for this campus
  - `cursusLabel` — display name for the cursus (e.g., `"42cursus"`, `"C Piscine Brussels"`)
  - `records[]` — available language options for this cursus
    - `label` — language name (e.g., `"English"`, `"Français"`)
    - `sr_id` — subsidiary record ID used by `projects.intra.42.fr` (find via DevTools on that site)

### Optional fields

- `clusters[]` — list of clusters on this campus
  - `id` — cluster ID from the 42 API
  - `name` — short lowercase name (used for seat matching)

- `definitions` — map of cluster name → seating layout
  - `rows[]` — range-based seating
    - `range` — row range like `"r2-r11"`
    - `pos` — position numbers
    - `dir` — screen direction: `"UP"` | `"DOWN"` | `"LEFT"` | `"RIGHT"` | `"NONE"`
  - `manual[]` — per-row seating without range
    - `row` — row name like `"r1"` or `"c1"`
    - `pos` — position numbers
    - `dir` — same as above
  - `overrides` — per-seat direction overrides
    - Key format: `"{row}-p{pos}"` (e.g., `"r1-p2"`)
    - Value: same direction as above

- `exits` *(optional)* — map of cluster name → exit sign markers for the cluster map
  - Key: cluster `name`
  - Each sign: `{ "x", "y", "dir", "label", "w"?, "h"? }`
    - `x` / `y` — SVG units or percentages of the map viewBox (e.g., `"22%"`)
    - `dir` — arrow direction: `"up"` | `"right"` | `"down"` | `"left"`
    - `label` — text shown below the arrow (e.g., `"EXIT"`, `"CHILLZONE"`)
    - `w` / `h` *(optional)* — override the default sign size
