# Maestro Mobile Testing for Redirector

Automated UI tests for the Redirector browser extension on Firefox for Android.

## Prerequisites

1. **Maestro CLI** installed:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Android emulator** or physical device connected via ADB:
   ```bash
   # Verify device is connected
   adb devices
   ```

3. **Firefox for Android** installed on the device:
   ```bash
   adb install firefox-latest.apk
   # Or install from Google Play Store on the emulator
   ```

4. **Redirector extension** installed in Firefox for Android:
   - Open Firefox on the device
   - Go to Menu > Add-ons > search for "Redirector"
   - Or load the .xpi from local build: `python3 build.py` then sideload

## Running Tests

Run all test flows:
```bash
maestro test .maestro/
```

Run a single flow:
```bash
maestro test .maestro/popup-flow.yaml
maestro test .maestro/settings-page-flow.yaml
maestro test .maestro/redirect-crud-flow.yaml
maestro test .maestro/mobile-layout-flow.yaml
maestro test .maestro/import-export-flow.yaml
```

Run with AI analysis:
```bash
maestro test .maestro/popup-flow.yaml --analyze | bash
```

## Test Flows

| Flow | Description |
|------|-------------|
| `popup-flow.yaml` | Tests popup UI rendering, enable/disable toggle, navigation |
| `settings-page-flow.yaml` | Tests settings page layout, create redirect form |
| `redirect-crud-flow.yaml` | Tests create, edit, disable, duplicate, delete operations |
| `mobile-layout-flow.yaml` | Verifies mobile-responsive layout, touch targets, scrolling |
| `import-export-flow.yaml` | Tests import/export and organize mode on mobile |

## Emulator Setup

For consistent results, use a phone-sized emulator:
```bash
# Create a Pixel 4 emulator (1080x2280, 440 dpi)
avdmanager create avd -n "Pixel4_API33" -k "system-images;android-33;google_apis;x86_64" -d "pixel_4"

# Launch the emulator
emulator -avd Pixel4_API33
```

## Notes

- Firefox for Android opens extension popups as full pages, not small popups
- Touch targets should be at least 44px for comfortable mobile interaction
- The extension uses Manifest V2 which is fully supported on Firefox for Android
- Tests assume the extension is already installed; adjust flows if testing fresh install
