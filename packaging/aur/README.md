# AUR packaging

Files for publishing the client on the [Arch User Repository](https://aur.archlinux.org/) as `nintendo-music-client-bin`.

The package repackages the official AppImage from the GitHub releases page, which is why it carries the `-bin` suffix. Building from source would need the Castlabs Electron fork (for Widevine DRM), which is not in the Arch repositories.

## Before the first publication

**Create an AUR account** at https://aur.archlinux.org/register and add your SSH **public** key to your account settings. The maintainer line in the PKGBUILD is already set to `axolated@proton.me`; use the same address for the account.

The project is licensed under GPL-3.0-or-later, which the PKGBUILD declares with its SPDX identifier. The licence text is not installed by the package because GPL-3.0 ships in Arch's `licenses` package under `/usr/share/licenses/common/`.

## Publishing

```bash
# 1. clone the (empty) AUR repository for the package
git clone ssh://aur@aur.archlinux.org/nintendo-music-client-bin.git
cd nintendo-music-client-bin

# 2. copy the two files from this directory
cp /path/to/packaging/aur/PKGBUILD .
cp /path/to/packaging/aur/.SRCINFO .

# 3. check it builds and installs cleanly (on Arch)
makepkg -si

# 4. lint it
namcap PKGBUILD
namcap nintendo-music-client-bin-*.pkg.tar.zst

# 5. publish
git add PKGBUILD .SRCINFO
git commit -m "Initial import: nintendo-music-client-bin 1.2.0"
git push
```

Only `PKGBUILD` and `.SRCINFO` belong in the AUR repository — never commit the built package, the AppImage or `pkg/` and `src/`.

## Updating for a new release

```bash
# in the AUR clone, after a new GitHub release
updpkgsums                      # refreshes sha256sums from the new source
makepkg --printsrcinfo > .SRCINFO
git commit -am "Update to <version>"
git push
```

Remember to bump `pkgver` and reset `pkgrel=1` first. `pkgrel` is only incremented when the packaging changes but the upstream version does not.

## Notes on this PKGBUILD

- **Sandbox** — the AppImage launches with `--no-sandbox`. An installed package should not, so `chrome-sandbox` is installed setuid root instead and the flag is dropped from the desktop entry. If the app refuses to start on a given system, adding `--no-sandbox` back to `Exec=` is the quick workaround.
- **Icon** — upstream ships a single 480×480 icon, which is not a standard hicolor size. It is installed both under `hicolor/480x480` and in `pixmaps` as a fallback. Shipping a 512×512 icon upstream would be cleaner.
- **Architecture** — the AppImage is x86_64 only, so the package is too.

## Untested

These files were written and cross-checked on Windows: the PKGBUILD and `.SRCINFO` were verified to agree field by field, the source URL returns HTTP 200 and the checksum matches the published AppImage. But `makepkg`, `namcap` and the install itself have **not** been run on an Arch system. Do step 3 above before pushing.
