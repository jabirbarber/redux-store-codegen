const fs = require('fs');
const CURRENT_DIR = process.cwd();

const createDir = function(path) {
	console.log('creating directory: ', path);
	fs.mkdirSync(CURRENT_DIR + path, { recursive: true }, err => {
		if (err) return console.error('error creating directory: ', err);
	});
};

const createFile = function(path, content) {
	console.log('creating file: ', path);
	fs.writeFileSync(CURRENT_DIR + path, content, err => {
		if (err) return console.error('error creating directory: ', err);
	});
};

const exitWithError = function(error) {
	console.error(error);
	process.exit(1);
};

const camelCase = (function() {
	var DEFAULT_REGEX = /[-_]+(.)?/g;

	function toUpper(match, group1) {
		return group1 ? group1.toUpperCase() : '';
	}
	return function(str, delimiters) {
		return str.replace(
			delimiters
				? new RegExp('[' + delimiters + ']+(.)?', 'g')
				: DEFAULT_REGEX,
			toUpper
		);
	};
})();

// Grab state shape
const state_shape_path = process.argv[2];
if (!state_shape_path) {
	exitWithError('Argument 1 Missing: Path to state shape json required');
}
let rawdata = fs.readFileSync(state_shape_path);
let shape = JSON.parse(rawdata);

let mainDir = '/store';
if (fs.existsSync(CURRENT_DIR + mainDir)) {
	mainDir = '/auto-generated-store';
}
createDir(mainDir);

// Create necessary files
const rootImports = [];
const rootKeys = [];

for (const reduxModule in shape) {
	if (shape.hasOwnProperty(reduxModule)) {
		const state = shape[reduxModule];
		const moduleDir = `${mainDir}/${reduxModule}`;
		createDir(moduleDir);

		let typesContent = [];
		let actionsContent = [];
		let reducerContent = [];
		let reducerCases = [];
		let selectorsContent = [];
		let parsedState = {};
		const selectorPrefix = '_';

		rootKeys.push(`    ${reduxModule},`);
		rootImports.push(
			`import ${reduxModule} from './${reduxModule}/reducer';`
		);

		actionsContent.push("import actions from './actionTypes';", '');

		for (const a in state) {
			if (state.hasOwnProperty(a)) {
				let val = state[a];
				let isAsync = val && val.isAsync;
				let verb = (isAsync && val.asyncVerb) || 'set';
				let actionName = `${verb.toUpperCase()}_${a.toUpperCase()}`;

				// create action types
				if (isAsync && verb) {
					typesContent.push(
						`export const ${actionName}_BEGIN = "${actionName}_BEGIN";`
					);
					typesContent.push(
						`export const ${actionName}_SUCCESS = "${actionName}_SUCCESS";`
					);
					typesContent.push(
						`export const ${actionName}_FAIL = "${actionName}_FAIL";`
					);
					typesContent.push('');
				} else {
					typesContent.push(
						`export const ${actionName} = "${actionName}";`
					);
					typesContent.push('');
				}

				// create action creators
				let creatorName = camelCase(`${verb}-${a}`);

				let creatorContent = isAsync
					? `
export function ${creatorName}() {
	return ${isAsync ? 'async function' : 'function'}(dispatch) {
		dispatch({ type: actions.${actionName}_BEGIN });
		try {
			const data = {} // await myAsyncTask();
			dispatch({ type: actions.${actionName}_SUCCESS, payload: data });
		} catch (error) {
			dispatch({ type: actions.${actionName}_FAIL, error });
		}
	};
}`
					: `
export function ${creatorName}(payload) {
	return {
		type: actions.${actionName},
		payload
	};
}`;
				actionsContent.push(creatorContent);

				// create reducer switch statements and selectors
				if (isAsync && verb) {
					let doing = camelCase(`is-${verb}ing-${a}`);
					let error = camelCase(`is-${verb}ing-${a}-error`);

					parsedState[a] = (val && val.value) || null;
					parsedState[doing] = false;
					parsedState[error] = null;

					//selectors
					selectorsContent.push(`
export const ${selectorPrefix +
						camelCase(
							`get-${doing}`
						)} = state => state.${reduxModule}.${a};
export const ${selectorPrefix +
						camelCase(
							`get-${doing}`
						)} = state => state.${reduxModule}.${doing};
export const ${selectorPrefix +
						camelCase(
							`get-${error}`
						)} = state => state.${reduxModule}.${error};
                        `);

					reducerCases.push(`
        case actions.${actionName}_BEGIN:
            return {
                ...state,
                ${doing}: true
            };

        case actions.${actionName}_SUCCESS:
            return {
                ...state,
                ${doing}: false,
                ${a}: action.payload
            };

        case actions.${actionName}_FAIL:
            return {
                ...state,
                ${doing}: false,
                ${error}: action.error
            };
        `);
				} else {
					// selectors
					parsedState[a] = val;
					selectorsContent.push(
						`export const ${selectorPrefix +
							camelCase(
								`get-${a}`
							)} = state => state.${reduxModule}.${a};`
					);

					reducerCases.push(`
        case actions.${actionName}:
            return {
                ...state,
                ${a}: action.payload
            };
        `);
				}
			}
		}

		reducerContent.push(`
import actions from './actionTypes';

export const initialState = ${JSON.stringify(parsedState, null, 2)}

export default (state = initialState, action) => {
    switch (action.type) {
        ${reducerCases.join('\n')}
        default:
            return state;
    }
};`);

		createFile(`${moduleDir}/actionTypes.js`, typesContent.join('\n'));
		createFile(`${moduleDir}/actions.js`, actionsContent.join('\n'));
		createFile(`${moduleDir}/reducer.js`, reducerContent.join('\n'));
		createFile(`${moduleDir}/selectors.js`, selectorsContent.join('\n'));
	}

	// create store.js

	createFile(
		mainDir + '/store.js',
		`
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';

${rootImports.join('\n')}

const rootReducer = combineReducers({
${rootKeys.join('\n')}
});

export const store = createStore(rootReducer, applyMiddleware(thunk));
    `
	);
}
