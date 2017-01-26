import * as fs from 'fs'
import * as glob from 'glob'
import { buildASTSchema, GraphQLSchema, parse } from 'graphql'

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
    sync?: Function
}

const loadSchema: ILoadSchemaFunc = (pattern: string, callback?: ISchemaCallback): Promise<GraphQLSchema> => {
  return new Promise((resolve, reject) => {
    getGlob(pattern)
      .then((fileNames) => readAllFiles(fileNames))
      .then((fileContentArr) => fileContentArr.join(""))
      .then((schemaFile) => parseSchema(schemaFile))
      .then((schema) => callback ? callback(null, schema) : resolve(schema))
      .catch((err) => callback ? callback(err, null) : reject(err))
  })
}

function parseSchema(fileData: string) {
  const doc = parse(fileData)
  return buildASTSchema(doc)
}

function getGlob(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (files.length === 0) {
        reject(GraphQLLoaderError.zeroMatchError(pattern) )
      } else {
        resolve(files)
      }
    })
  })
}

function readAllFiles(fileNames: string[]): Promise<string[]> {
  return Promise.all(fileNames.map(readFile))
}

function readFile(fileName: string): Promise<string> {
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
  return parseSchema(schema)
}

function getGlobSync(pattern: string) {
  const fileNames = glob.sync(pattern)
  if (fileNames.length === 0) {
    throw GraphQLLoaderError.zeroMatchError(pattern)
  } else {
    return fileNames
  }
}

function makeSchemaSync(fileNames: string[]) {
  return fileNames.map(readFileSync).join()
}

function readFileSync(fileName: string): string {
  return fs.readFileSync(fileName, 'utf8')
}

export { loadSchema }
