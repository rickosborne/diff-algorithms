const process = require("process");

const config = {
	checkLeaks: true,
	recursive: true,
	spec: [
		"dist-test/**/*.test.js",
		"dist-test/**/*.test.mjs",
		"ts/**/*.test.ts",
	],
};

const [ nodeMajor ] = process.versions.node.split(".").map((n) => parseInt(n, 10));

if (nodeMajor < 16) {
	// tsx doesn't work with node 14, and ESM support isn't amazing
	config.spec = config.spec.filter((s) => s.endsWith(".js"));
} else if (nodeMajor < 17) {
	process.env.NODE_NO_WARNINGS = "1";
	config.loader = "tsx";
} else {
	config["node-option"] = [ "import=tsx" ];
}

module.exports = config;
