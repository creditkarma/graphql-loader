import * as fs from 'fs'
import * as glob from 'glob'
import {
  buildASTSchema,
  concatAST,
  DocumentNode,
  GraphQLSchema,
  parse,
 } from 'graphql'

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
    (pattern: string, options?: glob.IOptions, callback?: ISchemaCallback): Promise<GraphQLSchema>
    sync?: Function
}

const loadSchema: ILoadSchemaFunc =
  (pattern: string, options?: glob.IOptions, callback?: ISchemaCallback): Promise<GraphQLSchema> => {
    return new Promise((resolve, reject) => {
      loadDocument(pattern, options)
        .then(buildASTSchema)
        .then((schema) => callback ? callback(null, schema) : resolve(schema))
        .catch((err) => callback ? callback(err, null) : reject(err))
    })
}

const loadDocument = (pattern: string, options?: glob.IOptions): Promise<DocumentNode> => {
  return new Promise((resolve, reject) => {
    getGlob(pattern, options)
      .then(makeSchema)
      .then(parse)
      .then(resolve)
      .catch(reject)
  })
}

const combineDocuments = (docs: [DocumentNode]): GraphQLSchema =>
  buildASTSchema(concatAST(docs))

const makeSchema = (fileNames: string[]): Promise<string> => {
  const promises = fileNames.map(readFile)
  return Promise.all( promises ).then((fileContentArr: string[]) => {
    return fileContentArr.join()
  }).catch((err) => {
    throw err
  })
}

const getGlob = (pattern: string, options?: glob.IOptions): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) => {
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

loadSchema.sync = (pattern: string, options?: glob.IOptions): GraphQLSchema => {
  const fileNames = getGlobSync(pattern, options)
  const schema = makeSchemaSync(fileNames)
  return buildASTSchema(parse(schema))
}

const getGlobSync = (pattern: string, options?: glob.IOptions) => {
  const fileNames = glob.sync(pattern)
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

export { loadSchema, loadDocument, combineDocuments }
