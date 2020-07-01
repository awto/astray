const assert = require("uvu/assert");
const { Suite } = require("benchmark");

console.log("Load times: ");

console.time("@babel/traverse");
const babel = require("@babel/traverse").default;
console.timeEnd("@babel/traverse");

console.time("estree-walker");
const estree = require("estree-walker");
console.timeEnd("estree-walker");

console.time("acorn-walk");
const acorn = require("acorn-walk");
console.timeEnd("acorn-walk");

console.time("ast-types");
const asttypes = require("ast-types");
console.timeEnd("ast-types");

console.time("astray");
const astray = require("astray");
console.timeEnd("astray");

console.time("@effectful/transducers");
const E = require("@effectful/transducers");
console.timeEnd("@effectful/transducers");

console.time("@effectful/transducers/v2");
const E2 = require("@effectful/transducers/v2/core");
console.timeEnd("@effectful/transducers/v2");

function babelTraverse(tree) {
	let count = 0;
	babel(tree, {
		noScope: true,
		Identifier() {
			count++;
		},
	});
	return count;
}

const walkers = {
	"estree-walker": (tree) => {
		let count = 0;
		estree.walk(tree, {
			enter(n) {
				if (n.type === "Identifier") {
					count++;
				}
			},
		});
		return count;
	},
	"acorn-walk": (tree) => {
		let count = 0;
		acorn.simple(tree, {
			Identifier() {
				count++;
			},
		});
		return count;
	},
	"ast-types": (tree) => {
		let count = 0;
		asttypes.visit(tree, {
			visitIdentifier(path) {
				count++;
				this.traverse(path);
			},
		});
		return count;
	},
	astray: (tree) => {
		let count = 0;
		astray.walk(tree, {
			Identifier() {
				count++;
			},
			// Identifier: {
			// 	enter() {
			// 		count++;
			// }
		});
		return count;
	},
};

function effectfulTransducers(toks) {
	let count = 0;
	for (const i of toks) {
		if (i.enter && i.type === E.Tag.Identifier) count++;
	}
	return count;
}

function effectfulTransducersV2(root) {
	let i = root;
	const to = root.nextSibling;
	let count = 0;
	do {
		const n = E2.next(i);
		if (i.type === E.Tag.Identifier) count++;
		i = n;
	} while (i !== to);
	return count;
}

function effectfulTransducersV2Indexed(root) {
	return root.ids.size;
}

function index(root) {
	const ids = (root.ids = new Set());
	for (let i = root.firstChild; i !== root; i = E2.next(i)) {
		if (i.type === E.Tag.Identifier) ids.add(i);
	}
}

console.log("\nValidation: ");
const BABEL_INPUT = require("./fixture-babel.json");

function check(name, input, func) {
	const idents = func(input);
	try {
		assert.is(idents, 41669, "saw 41,669 identifiers");
		console.log("  ✔", `${name} (41,669 identifiers)`);
	} catch (err) {
		console.log("  ✘", `${name} (${idents.toLocaleString()} identifiers)`);
	}
	bench.add(name + " ".repeat(34 - name.length), () => func(input));
}

const bench = new Suite().on("cycle", (e) => {
	console.log("  " + e.target, e.target.hz.toFixed(3));
});

check("@babel/traverse", BABEL_INPUT, babelTraverse);
Object.keys(walkers).forEach((name) => {
	check(name, require("./fixture.json"), walkers[name]);
});

const EFFECTFUL_INPUT = Array.from(E.produce(BABEL_INPUT, E.Tag.top));
const EFFECTFUL2_INPUT = E2.produce(BABEL_INPUT);
index(EFFECTFUL2_INPUT);
check("@effectful/transducers", EFFECTFUL_INPUT, effectfulTransducers);
check("@effectful/transducersV2", EFFECTFUL2_INPUT, effectfulTransducersV2);
check(
	"@effectful/transducersV2-indexed",
	EFFECTFUL2_INPUT,
	effectfulTransducersV2Indexed
);

console.log("\nBenchmark:");
bench.run();
