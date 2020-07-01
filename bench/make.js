const fs = require('fs');
const path = require('path');
const meriyah = require('meriyah');
const babylon = require("@babel/parser")

const D3 = require.resolve('d3/dist/d3.min.js');

const source = fs.readFileSync(D3, 'utf8');
const AST = meriyah.parse(source, { next: true });

fs.writeFileSync(
	path.join(__dirname, 'fixture.json'),
	JSON.stringify(AST, null, 2),
);

const BabelAST = babylon.parse(source);

fs.writeFileSync(
	path.join(__dirname, 'fixture-babel.json'),
	JSON.stringify(BabelAST, null, 2),
);
