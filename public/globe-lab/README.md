# Globe Lab assets

Served at `/globe-lab/...`. Nothing in this folder is fetched from third parties at runtime.
If a file is missing the engine falls back (lower tier, then the built-in procedural Earth) and the
legend says which one is active.

## Earth textures: `public/globe-lab/earth/`

All maps are equirectangular (360 x 180 degrees), longitude -180 at the left edge, north at the top, JPEG.

| File | Content | Notes |
|---|---|---|
| `earth_day_{2k,4k,8k}.jpg` | Day colour | Required. 2k = 2048x1024, 4k = 4096x2048, 8k = 8192x4096 |
| `earth_night_{2k,4k}.jpg` | City lights on black | Optional |
| `earth_normal_{2k,4k}.jpg` | Tangent-space normal map, OpenGL style (green = north) | Optional. If terrain looks inverted pass `normalScale={-1}` |
| `earth_spec_{1k,2k}.jpg` | Ocean mask, white = water | Optional (ocean sun glint) |
| `earth_clouds_{1k,2k,4k}.jpg` | **Grayscale** cloud coverage | Optional. Must be grayscale, not a transparent PNG |

Which sizes are requested per tier:

| Tier | day | night | normal | spec | clouds | Approx. GPU memory |
|---|---|---|---|---|---|---|
| `low` (phones, small screens) | 2k | 2k | 2k | 1k | 1k | ~35 MB |
| `medium` (desktop default) | 4k | 2k | 4k | 2k | 2k | ~125 MB |
| `ultra` (`textureTier="ultra"`, needs 8192 max texture size) | 8k | 4k | 4k | 2k | 4k | ~330 MB |

The estimates are uncompressed RGBA with mipmaps. KTX2/Basis compression is not wired in yet.

### Sources (check each licence yourself before shipping)
- NASA Visible Earth "Blue Marble" imagery and NASA Earth Observatory "Black Marble" night lights: NASA media, generally public domain, credit NASA.
- Solar System Scope texture pack (day, night, normal, specular, clouds up to 8k): listed as CC BY 4.0, so attribution is required.
- Any other pack: confirm it allows redistribution in a web app.

I could not download or verify any of these from the build environment, so none are included.

### Resizing with ImageMagick (example)
```bash
magick src/day.jpg    -resize 4096x2048 -quality 85 -interlace Plane earth_day_4k.jpg
magick src/day.jpg    -resize 2048x1024 -quality 85 earth_day_2k.jpg
magick src/night.jpg  -resize 2048x1024 -quality 85 earth_night_2k.jpg
magick src/normal.jpg -resize 4096x2048 -quality 92 earth_normal_4k.jpg
magick src/spec.jpg   -colorspace Gray -resize 2048x1024 -quality 85 earth_spec_2k.jpg
magick src/clouds.jpg -colorspace Gray -resize 2048x1024 -quality 85 earth_clouds_2k.jpg
```

### Alignment check
With the textures in place, in the lab page call `ref.current.flyTo(0, 0, 2)`: the Gulf of Guinea (Africa's west coast bulge) should be centred.
`flyTo(28.6, 77.2, 2)` should centre northern India. Night lights should sit on land, not ocean.

## Detailed models: `public/globe-lab/models/` (optional)
The engine builds a representative model per category by itself. To use your own binary glTF for the
selected satellite pass `modelUrls={{ comms: '/globe-lab/models/comms.glb', station: '/globe-lab/models/iss.glb' }}`
(keys: `comms`, `starlink`, `nav`, `weather`, `cubesat`, `station`). Axes: +X along-track, +Y solar-array axis, +Z away from Earth.
Models are normalised to unit size, loaded lazily, and never loaded on low-tier devices unless `detailedModels={true}`.
Check each model's licence (NASA 3D Resources models vary, Sketchfab models are per-author).
