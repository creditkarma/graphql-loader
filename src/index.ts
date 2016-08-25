import * as fs from 'fs'
import * as graphql from 'graphql'
import * as glob from 'glob'

export class GraphQLLoaderError extends Error {
  public static zeroMatchError(glob: string): GraphQLLoaderError {
    return new GraphQLLoaderError(`The glob pattern "${glob}" has zero matches`)
  }
  constructor(message: string) {
    super(message)
    this.name = 'GraphQLLoaderError'
  }
}

export interface SchemaCallback {
  (err: GraphQLLoaderError, schema: graphql.GraphQLSchema)
}

export interface LoadSchemaFunc {
    (pattern: string, callback?: SchemaCallback): Promise<graphql.GraphQLSchema>
    sync?: Function
}


const loadSchema: LoadSchemaFunc = function(pattern: string, callback?: SchemaCallback): Promise<graphql.GraphQLSchema> {
  return new Promise(async (resolve, reject) => {
    try {
      const files = await getGlob(pattern)
      const schemaFile = await makeSchema(files)
      const schema = parseSchema(schemaFile)
      callback ? callback(null, schema) : resolve(schema)
    } catch (err) {
      callback ? callback(err, null) : reject(err)
    }
  })
}

function makeSchema(fileNames: string[]): Promise<string> {
  const promises = fileNames.map(readFile)
  return Promise.all( promises ).then((fileContentArr: string[]) => {
    return fileContentArr.join()
  }).catch((err) => {
    throw err
  })
}

function parseSchema(fileData: string) {
  const doc = graphql.parse(fileData)
  return graphql.buildASTSchema(doc)
}

function getGlob(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (err || files.length === 0) {
        reject( err || GraphQLLoaderError.zeroMatchError(pattern) )
      } else {
        resolve(files)
      }
    })
  })
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

loadSchema.sync = function(pattern: string): graphql.GraphQLSchema {
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

export default loadSchema
