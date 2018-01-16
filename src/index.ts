import * as deepmerge from 'deepmerge'
import * as fs from 'fs'
import * as Glob from 'glob'
import {
  buildASTSchema,
  DocumentNode,
  GraphQLSchema,
  ObjectTypeDefinitionNode,
  parse,
  SchemaDefinitionNode,
 } from 'graphql'
import { addResolveFunctionsToSchema } from 'graphql-tools'

import * as Kind from 'graphql/language/kinds'

export class GraphQLLoaderError extends Error {
  public static zeroMatchError(glob: string): GraphQLLoaderError {
    return new GraphQLLoaderError(`The glob pattern "${glob}" has zero matches`)
  }
  constructor(message: string) {
    super(message)
    this.name = 'GraphQLLoaderError'
  }
}

export interface ISchemaCallback {
  (err: GraphQLLoaderError, schema: GraphQLSchema)
}

export interface ILoadSchemaFunc {
    (pattern: string, callback?: ISchemaCallback): Promise<GraphQLSchema>
    sync?: (pattern: string) => GraphQLSchema
}

export interface IGraphQLModule {
    document: DocumentNode,
    resolvers?: any
}

export type IGraphQLModuleFunction = () => IGraphQLModule | Promise<IGraphQLModule>

/**
 * Given a GLOB pattern, it will load all the content of the files matching the GLOB, combine them
 * together and return a GraphQL Schema
 * @param pattern String - GLOB pattern
 * @param callback ISchemaCallback
 */
export const loadSchema: ILoadSchemaFunc = (pattern: string, callback?: ISchemaCallback): Promise<GraphQLSchema> => {
  return new Promise((resolve, reject) => {
    loadDocument(pattern)
      .then(buildASTSchema)
      .then((schema) => callback ? callback(null, schema) : resolve(schema))
      .catch((err) => callback ? callback(err, null) : reject(err))
  })
}

/**
 * Given a GLOB pattern, load the matching files, combine them together and return a GraphQL AST in
 * the form of a DocumentNode
 * @param pattern String - GLOB pattern
 */
export const loadDocument = (pattern: string): Promise<DocumentNode> =>
  getGlob(pattern).then(combineFiles).then(parse)

/**
 * Given an array of DocumentNodes, merge them together and return a GraphQLSchema
 * * Any duplicate Type definitions will be merged by concating their fields
 * * Any duplicate Schema definitions will be merged by concating their operations
 * @param docs DocumentNode[]
 */
export const combineDocuments = (docs: DocumentNode[]): GraphQLSchema =>
  buildASTSchema(concatAST(docs))

/**
 * Given an array of GraphQLModules or functions that return a GraphQLModule or Promise,
 * merge the documents and resolvers together and return an executable GraphQL Schema
 * @param modules IGraphQLModule[] | IGraphQLModuleFunction[]
 */
export const executableSchemaFromModules =
  (modules: IGraphQLModule[] | IGraphQLModuleFunction[]): Promise<GraphQLSchema> => {
    const promises = convertModulesToPromises(modules)
    return Promise.all(promises).then((gqlModules) => {
      const schema = combineDocuments(gqlModules.map((mod) => mod.document))
      const resolvers = gqlModules.reduce((prev, curr) => deepmerge(prev, curr.resolvers || {}), {})
      addResolveFunctionsToSchema(schema, resolvers)
      return schema
    }).catch((e) => { throw e })
}

const convertModulesToPromises =
  (modules: IGraphQLModule[] | IGraphQLModuleFunction[]): Array<Promise<IGraphQLModule>> => {
    return (modules as IGraphQLModuleFunction[]).map((mod) => {
      const result = typeof mod === 'function' ? mod() : mod
      if ((result as IGraphQLModule).document) {
        return Promise.resolve(result)
      } else {
        return result as Promise<IGraphQLModule>
      }
    })
  }

const filterDups = (dups: ObjectTypeDefinitionNode[], doc: ObjectTypeDefinitionNode, index: number, orig) => {
  const hasDups = orig.filter((_) => _.name.value === doc.name.value).length > 1
  const docInDups = dups.find((_) => _.name.value === doc.name.value)
  return hasDups && !docInDups ? dups.concat(doc) : dups
}

const mergeFields = (allDefs: ObjectTypeDefinitionNode[]) => (dup) => {
  allDefs.forEach((def) => {
    if (def.name && def.name.value === dup.name.value && def !== dup) {
      dup.fields = dup.fields.concat(def.fields)
    }
  })
  return dup
}

const mergeOperations = (allDefs: SchemaDefinitionNode[]) => (dup) => {
  allDefs.forEach((def) => {
    if (def.kind === Kind.SCHEMA_DEFINITION && def !== dup) {
      const findTypes = (opType) => !dup.operationTypes.find((dupType) => dupType.operation === opType.operation)
      const deduped = def.operationTypes.filter(findTypes)
      dup.operationTypes = dup.operationTypes.concat(deduped)
    }
  })
  return dup
}

const isKind = (kind) => (def) => def.kind === kind

const filterSchemaAndDups = (dups) => (def) => {
  return def.kind !== Kind.SCHEMA_DEFINITION && !dups.find((_) => _.name.value === def.name.value)
}

const concatAST = (documents: DocumentNode[]): DocumentNode => {
  const allDefs = documents.reduce((defs, doc) => defs.concat(doc.definitions), [])

  // find all duplicate type definitions and merge their fields together
  const dups = allDefs.filter(isKind(Kind.OBJECT_TYPE_DEFINITION)).reduce(filterDups, []).map(mergeFields(allDefs))
  // find all duplicate schema definitions and merge their operations together
  const schemas = allDefs.filter(isKind(Kind.SCHEMA_DEFINITION)).slice(0, 1).map(mergeOperations(allDefs))

  const definitions = allDefs.filter(filterSchemaAndDups(dups)).concat(schemas, dups)

  return {
    definitions,
    kind: 'Document',
  }
}

const combineFiles = (fileNames: string[]): Promise<string> => {
  const promises = fileNames.map(readFile)
  return Promise.all( promises )
    .then((fileContents) => fileContents.join())
    .catch((err) => { throw err })
}

const getGlob = (pattern: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    Glob(pattern, (err, files) => {
      if (files.length === 0) {
        reject(GraphQLLoaderError.zeroMatchError(pattern) )
      } else {
        resolve(files)
      }
    })
  })
}

const readFile = (fileName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

loadSchema.sync = (pattern: string): GraphQLSchema => {
  const fileNames = getGlobSync(pattern)
  const schema = makeSchemaSync(fileNames)
  return buildASTSchema(parse(schema))
}

const getGlobSync = (pattern: string) => {
  const fileNames = Glob.sync(pattern)
  if (fileNames.length === 0) {
    throw GraphQLLoaderError.zeroMatchError(pattern)
  } else {
    return fileNames
  }
}

const makeSchemaSync = (fileNames: string[]) => {
  return fileNames.map(readFileSync).join()
}

const readFileSync = (fileName: string): string => {
  return fs.readFileSync(fileName, 'utf8')
}
