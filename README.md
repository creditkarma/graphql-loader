# graphql-loader

Instantiate a GraphQL Schema by loading GraphQL Schema Language files based on a glob pattern

* Allows creation of GraphQL Schema via GraphQL schema language shorthand
* Supports splitting the schema into modules
* Parse and validate schema files
* Load GraphQL files from different modules and merge them into a single GraphQL Schema

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

## loadSchema

Given a GLOB pattern, it will load all the content of the files matching the GLOB, combine them
together and return a GraphQL Schema

Create a schema using promises:

```js
const loader = require('@creditkarma/graphql-loader')

loader.loadSchema('./schema/*.graphql').then((schema) => {
  console.log(schema.getQueryType().toString())
})
```

Create a schema with a callback:

```js
const loader = require('@creditkarma/graphql-loader')

loader.loadSchema('./schema/*.graphql', (err, schema) => {
  console.log(schema.getQueryType().toString())
})
```

Create a schema using sync:

```js
const loader = require('@creditkarma/graphql-loader')

const schema = loader.loadSchema.sync('./schema/*.graphql')
console.log(schema.getQueryType().toString())

```

## executableSchemaFromModules

Given an array of GraphQL Modules or functions that returns a GraphQL Module or Promise,
merge the documents and resolvers together and return an executable GraphQL Schema

GraphQL modules are comprised of a document node and resolvers to provide away to decompose
a GraphQL server into stand alone Node.js modules.  These modules expose a DocumentNode because
document nodes are valid GraphQL segments that are not required to be a complete valid schema.

It is required that the combination of GraphQLModules results in a completely valid GraphQLSchema.

```js
const modules = [
  () => loadDocument('./fixtures/user/**/*.graphql').then((document) => ({ document, resolvers: {}})),
  () => loadDocument('./fixtures/swapi/**/*.graphql').then((document) => ({ document, resolvers: {}})),
]
executableSchemaFromModules(modules).then((schema) => {
  console.log(schema.getQueryType().toString())
})

```

## loadDocument

Given a GLOB pattern, load the matching files, combine them together and return a GraphQL AST in
the form of a DocumentNode.  The document node will be parsed and validate but doesn't have to meet all
the requirements of a full schema definition.  For example, it is possible to just load several files
with only types defined.  *NOTE:* You must use a DocumentNode with the combineDocuments function

Load several GraphQL files into a single DocumentNode

```js
const loader = require('@creditkarma/graphql-loader')

loader.loadDocument('./schema/*.graphql').then((doc) => {
  console.log(doc)
})
```
## combineDocuments

Given an array of DocumentNodes, merge them together and return a GraphQLSchema
* Any duplicate Type definitions will be merged by concatenating their fields
* Any duplicate Schema definitions will be merged by concatenating their operations

Combine several documents into a GraphqlSchema

```js
const loader = require('@creditkarma/graphql-loader')

Promise.all(
  loader.loadDocument('./ships/graphql/**/*.graphql'),
  loader.loadDocument('./planets/graphql/**/*.graphql')
).then((docs) => {
  const schema = combineDocuments(docs)
  console.log(schema.getQueryType().toString())
})
```

## Development

Install dependencies with

```sh
npm install
```

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
