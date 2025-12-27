import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';
import { cp, mkdir } from 'node:fs/promises';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '*.{node,dylib}',
      unpackDir: '{better-sqlite3}',
    },
    icon: './assets/hermie-logo.ico'
  },
  rebuildConfig: {
    onlyModules: ['better-sqlite3'],
    force: true,
    platform: process.platform,
    buildFromSource: true,
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    async packageAfterCopy(_forgeConfig, buildPath) {
      // Copy better-sqlite3 and ALL its dependencies
      const sourceNodeModulesPath = path.resolve(__dirname, 'node_modules');
      const destNodeModulesPath = path.resolve(buildPath, 'node_modules');
  
      // Get all dependencies of better-sqlite3
      const packagesToCopy = [
        'better-sqlite3',
        'bindings',
        'file-uri-to-path',
        'prebuild-install',
        'node-gyp-build'
      ];
  
      await mkdir(destNodeModulesPath, { recursive: true });
  
      await Promise.all(
        packagesToCopy.map(async (packageName) => {
          const sourcePath = path.join(sourceNodeModulesPath, packageName);
          const destPath = path.join(destNodeModulesPath, packageName);
  
          try {
            await mkdir(path.dirname(destPath), { recursive: true });
            await cp(sourcePath, destPath, {
              recursive: true,
              preserveTimestamps: true,
            });
            console.log(`✓ Copied ${packageName}`);
          } catch (error) {
            console.warn(`⚠ Could not copy ${packageName}:`, error);
          }
        })
      );
    },
  },
};

export default config;