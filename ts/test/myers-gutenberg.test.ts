import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as process from "node:process";
import { before, describe } from "mocha";
import { expect } from "chai";
import { applyPatch } from "../apply-patch.js";
import { myersDiff } from "../myers.js";
import { patchConfigForTest } from "./patch-config-for-test.js";

const MUCH_ADO_URL = "https://www.gutenberg.org/cache/epub/1519/pg1519.txt";
const CACHE_DIR = ".cache";
const MUCH_ADO_FILENAME = "much-ado.txt";

const doOnlineTests = (): boolean => {
	const envValue = process.env.ONLINE_TESTS?.trim().toLocaleUpperCase();
	// false for anything empty or falsy
	return envValue != null && envValue !== "" && envValue !== "0" && envValue !== "NO" && envValue !== "FALSE";
};

describe("online tests via Project Gutenberg", async () => {
	let muchAdoOriginal: string | undefined;

	before(async () => {
		await fs.mkdir(CACHE_DIR, { recursive: true });
		const txtPath = path.join(CACHE_DIR, MUCH_ADO_FILENAME);
		const stats = await fs.stat(txtPath).catch(() => undefined);
		if (stats != null && !stats.isFile()) {
			throw new Error(`Expected a file: ${ txtPath }`);
		}
		if (stats != null) {
			console.debug(`Loading from existing file: ${ txtPath }`);
			muchAdoOriginal = await fs.readFile(txtPath, { encoding: "utf-8" });
		} else if (doOnlineTests()) {
			console.debug(`Fetching from Project Gutenberg: ${ MUCH_ADO_URL }`);
			const response = await fetch(MUCH_ADO_URL);
			let contentType = response.headers.get("content-type");
			if (response.ok && contentType?.startsWith("text/")) {
				muchAdoOriginal = await response.text();
				console.debug(`Writing ${ muchAdoOriginal.length } bytes to cache file: ${ txtPath }`);
				await fs.writeFile(txtPath, muchAdoOriginal, { encoding: "utf-8" });
			} else {
				throw new Error(`Unexpected response: ${ response.status } ${ response.statusText } ${ contentType ?? "??" }`);
			}
		}
	});

	it("can process large blocks of text", () => {
		if (muchAdoOriginal == null) {
			// Online tests not enabled, and text file not in cache.
			expect(false).equals(false);
			return;
		}
		const spoken = "Quinn";
		const directed = "QUINN";
		const modernized = muchAdoOriginal.replace(/Benedick/ig, (name) => {
			return (name.toUpperCase() === name) ? directed : spoken;
		});
		const originalLines = muchAdoOriginal.split("\n");
		const modernizedLines = modernized.split("\n");
		const diff = myersDiff(originalLines, modernizedLines);
		const assembledOriginal: string[] = applyPatch(
			modernizedLines,
			diff,
			patchConfigForTest(true),
		);
		const assembledModernized: string[] = applyPatch(
			originalLines,
			diff,
			patchConfigForTest(false),
		);
		expect(assembledOriginal).eql(originalLines, "original lines");
		expect(assembledModernized).eql(modernizedLines, "modernized lines");
	});
});
