#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dependentRepos = ['../LumiaStream', '../Web-Lumia', '../Overlay-UI', '../Developer-Docs', '../Lumia-UI'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const installTarget = `${pkg.name}@${pkg.version}`;

let hadError = false;

const getInstallCommand = (repoPath) => {
	const packageJsonPath = resolve(repoPath, 'package.json');
	let packageManager = '';

	if (fs.existsSync(packageJsonPath)) {
		try {
			const repoPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			if (typeof repoPackageJson.packageManager === 'string') {
				packageManager = repoPackageJson.packageManager.split('@')[0].trim();
			}
		} catch (error) {
			console.warn(`Could not parse package.json for ${repoPath}, falling back to lockfile detection.`);
		}
	}

	if (!packageManager) {
		if (fs.existsSync(resolve(repoPath, 'pnpm-lock.yaml'))) {
			packageManager = 'pnpm';
		} else if (fs.existsSync(resolve(repoPath, 'yarn.lock'))) {
			packageManager = 'yarn';
		} else {
			packageManager = 'npm';
		}
	}

	if (packageManager === 'pnpm') {
		return { cmd: 'pnpm', args: ['add', '--save-exact', installTarget] };
	}
	if (packageManager === 'yarn') {
		return { cmd: 'yarn', args: ['add', '--exact', installTarget] };
	}

	return { cmd: 'npm', args: ['install', '--save-exact', installTarget] };
};

for (const relativeRepoPath of dependentRepos) {
	const repoPath = resolve(packageRoot, relativeRepoPath);
	if (!fs.existsSync(repoPath)) {
		console.log(`Skipping missing repo: ${repoPath}`);
		continue;
	}

	try {
		const { cmd, args } = getInstallCommand(repoPath);
		console.log(`Installing ${installTarget} in ${repoPath} using ${cmd}`);
		execFileSync(cmd, args, {
			cwd: repoPath,
			stdio: 'inherit',
		});
	} catch (error) {
		hadError = true;
		console.error(`Failed to install in ${repoPath}: ${error.message}`);
	}
}

if (hadError) {
	process.exitCode = 1;
}
