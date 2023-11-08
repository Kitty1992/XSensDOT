const path = require("path");

const resourceHackerPath = path.join(__dirname, "./resource_hacker/ResourceHacker.exe");
const pkgCachePath = "./pkg-cache";
process.env["SOURCE_RESOURCE_HACKER"] = resourceHackerPath;
process.env["PKG_CACHE_PATH"] = pkgCachePath;

const execSync = require("child_process").execSync;

const fs = require("fs-extra");
const pkg = require("pkg");
const pkgfetch = require("pkg-fetch");

const customIconPath = "xsens_icon_set.ico";
const specificNodeVersion = "12.16.1";
const originalPkgPrecompiledBinaries =`${pkgCachePath}/v2.6/fetched-v${specificNodeVersion}-win-x64.original`;
const customizedPkgPrecompiledBinaries =`${pkgCachePath}/v2.6/fetched-v${specificNodeVersion}-win-x64`;

async function downloadOriginalPkgPrecompiledBinaries() {
    if (!fs.existsSync(originalPkgPrecompiledBinaries)) {
        await pkgfetch.need({nodeRange:`node${specificNodeVersion}`, platform:"win", arch:"x64"});

        await customizePkgPrecompiledBinaries();
    }
}

async function customizePkgPrecompiledBinariesIcon() {
  execSync(`${resourceHackerPath} -open ./pkg-cache/v2.6/fetched-v${specificNodeVersion}-win-x64.original -save ./pkg-cache/v2.6/fetched-v${specificNodeVersion}-win-x64 -resource ${customIconPath} -action addoverwrite -mask ICONGROUP,1,`);
}

async function customizePkgPrecompiledBinaries() {
    await fs.rename(
        customizedPkgPrecompiledBinaries,
        originalPkgPrecompiledBinaries
        );

    await customizePkgPrecompiledBinariesIcon();
}

async function changeIcon() {
    console.log("Download pkg precompiled libraries");
    await downloadOriginalPkgPrecompiledBinaries();
}

changeIcon();
