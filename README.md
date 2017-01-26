# graphql-loader

Instantiate a GraphQL Schema by loading GraphQL Schema Language files based on a glob pattern

* Allows creation of GraphQL Schema via GraphQL schema language shorthand
* Supports splitting the schema into modules
* Parse and validate schema files

## Installation

```sh
npm install --save graphql @creditkarma/graphql-loader
```

## Usage

Given the following files

schema/schema.graphql

```
schema {
  query: RootQuery
}
```

schema/rootQuery.graphql

```
type RootQuery {
  testString: String
}
```

Create a schema with the following code:

```js
const loader = require('@creditkarma/graphql-loader')

loader.loadSchema('./schema/*.graphql', (err, schema) => {
  console.log(schema.getQueryType().toString())
})
```

Create a schema using promises:

```js
const loader = require('@creditkarma/graphql-loader')

loader.loadSchema('./schema/*.graphql').then((schema) => {
  console.log(schema.getQueryType().toString())
})
```

Create a schema using sync:

```js
const loader = require('@creditkarma/graphql-loader')

const schema = loader.loadSchema.sync('./schema/*.graphql')
console.log(schema.getQueryType().toString())

```

Create a schema using promises, and then log out the generated `.graphql` contents:

```js
const graphql = require('graphql')
const loader = require('@creditkarma/graphql-loader')

loader.loadSchema('./schema/*.graphql').then((schema) => {
  console.log(graphql.printSchema(schema))
}).catch(err => console.log(err))
```

## Development

Install dependencies with

```sh
npm install
npm install graphql@^0.8.0
```

The `graphql` package is needed for tests to succeed, but is only included as a peer dependency.

### Build

```sh
npm run build
```


### Run test in watch mode

```sh
npm run test:watch
```

## Contributing
For more information about contributing new features and bug fixes, see our [Contribution Guidelines](https://github.com/creditkarma/CONTRIBUTING.md).
External contributors must sign Contributor License Agreement (CLA)

## License
This project is licensed under [Apache License Version 2.0](./LICENSE)
