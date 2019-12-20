## Code Generator for Redux

## Prerequsites

```
npm install --save-dev git+https://github.com/jabirbarber/redux-store-codegen.git
```

```
npm install redux react-redux redux-thunk
```

## Instructions

1.  cd into the directory you want to create the store in
2.  create **store.schema.json** file in the directory, each key represents a module, eg.

        ```json
        {
        	"auth": {
        		"user": {
                    "value": {},
                    "isAsync": true,
                    "asyncVerb": "fetch",
                },
        		"access_token": null,
        		"refresh_token": null
        	},
        	"posts": {
        		"posts": {
                    "value": [],
                    "isAsync": true,
                    "asyncVerb": "fetch",
                }
        	},
        	"comments": {
                "comments": null,
                "likeCount": null
            }
        }
        ```

    _Note: If isAsync flag is provided, \_BEGIN, \_SUCCESS, \_FAIL action types will automatically be created along with relevant state flags_

3.  run script, passing in schema as first parameter

```
node ./node_modules/redux-store-codegen/script.js ./store.schema.json
```

4.  /store directory will be auto generated, enjoy!

    _Note: import your newly created store from /store/store.js in App.js component and wrap with provider as per redux installation guide: <https://react-redux.js.org/introduction/quick-start#provider>_
