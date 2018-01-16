import {expect} from 'code'
import * as Lab from 'lab'
export const lab = Lab.script()

const describe = lab.describe
const it = lab.it
const before = lab.before

import * as fs from 'fs'
import { DocumentNode, GraphQLSchema } from 'graphql'
import * as mkdirp from 'mkdirp'
import * as rimraf from 'rimraf'
import {
  combineDocuments,
  executableSchemaFromModules,
  GraphQLLoaderError,
  loadDocument,
  loadSchema,
} from '../index'

const glob = './fixtures/swapi/**/*.graphql'
const userGlob = './fixtures/user/**/*.graphql'
const invalidGlob = './error/*.graphql'
const invalidSchemaGlob = './fixtures/swapi/*.graphql'

const invalidGlobPattern = /has zero matches/
const invalidSchemaPattern = /Type .* not found in document./

describe('Sync Schema Loader', () => {
  describe(`when glob loading with complete schema "${glob}"`, () => {
    const schema = loadSchema.sync(glob)

    it('expect schema to be a graphql schema', () => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
    })
  })

  describe(`when loading an invalid glob "${invalidGlob}"`, () => {
    it('expect error to be triggered', () => {
      const throws = () => { loadSchema.sync(invalidGlob) }
      expect( throws ).to.throw(GraphQLLoaderError, invalidGlobPattern)
    })
  })
  describe(`when loading glob with invalid schema ${invalidSchemaGlob}`, () => {
    it('expect schema errors to exist', () => {
      const throws = () => { loadSchema.sync(invalidSchemaGlob) }
      expect( throws ).to.throw(Error, invalidSchemaPattern)
    })
  })
})

describe('Schema Loader', () => {
  describe(`when loading glob with complete schema "${glob}"`, () => {
    let schema
    let cbSchema
    before(() =>
      loadSchema(glob).then((results) => {
        schema = results
        return new Promise((resolve, reject) => {
          loadSchema(glob, (err, cbResults) => {
            cbSchema = cbResults
            resolve()
          })
        })
      }))

    it('expect schema to be a graphql schema', () => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
    })

    it('expect callback schema to be a graphql schema', () => {
      expect(cbSchema).to.exist()
      expect(cbSchema).to.be.an.instanceof(GraphQLSchema)
    })
  })

  describe(`when loading an invalid glob "${invalidGlob}"`, () => {
    let schemaErrors
    let cbSchemaErrors
    before(() =>
      loadSchema(invalidGlob).catch((err) => {
        schemaErrors = err
        return new Promise((resolve, reject) => {
          loadSchema(invalidGlob, (cbErr, cbResults) => {
            cbSchemaErrors = cbErr
            resolve()
          })
        })
      }))

    it('expect glob error to be triggered', () => {
      expect(schemaErrors).to.exist()
      expect(schemaErrors.message).to.match(invalidGlobPattern)
    })

    it('expect callbaack glob error to be triggered', () => {
      expect(cbSchemaErrors).to.exist()
      expect(cbSchemaErrors.message).to.match(invalidGlobPattern)
    })
  })

  describe(`when loading glob with invalid schema "${invalidSchemaGlob}"`, () => {
    let schemaErrors
    let cbSchemaErrors
    before(() =>
      loadSchema(invalidSchemaGlob).catch((err) => {
        schemaErrors = err
        return new Promise((resolve, reject) => {
          loadSchema(invalidSchemaGlob, (cbErr) => {
            cbSchemaErrors = cbErr
            resolve()
          })
        })
      }))

    it('expect error to be invalidSchemaPattern', () => {
      expect(schemaErrors).to.exist()
      expect(schemaErrors).to.match(invalidSchemaPattern)
    })
    it('expect callback error to be invalidSchemaPattern', () => {
      expect(schemaErrors).to.exist()
      expect(schemaErrors).to.match(invalidSchemaPattern)
    })
  })

  describe('when loading glob with unreadable files', () => {
    const root = './fixtures/unreadable'
    const badGlob = `${root}/*.graphql`
    let results
    let cbResults
    before(() =>
      new Promise((resolve, reject) => {
        mkdirp(root, () => {
          fs.writeFile(`${root}/schema.graphql`, 'hello', {mode: '333'}, (err) => {
            loadSchema(badGlob).catch((r) => {
              results = r
              loadSchema(badGlob, (cbr) => {
                cbResults = cbr
                rimraf(root, () => true)
                resolve()
              })
            })
          })
        })
      }))

    it('expect error to exist', () => {
      expect(results).to.exist()
    })
    it('expect callback error to exist', () => {
      expect(cbResults).to.exist()
    })
  })
})

describe('Loading Document', () => {
  describe(`when loading glob with complete schema "${glob}"`, () => {
    let doc: DocumentNode
    before(() => loadDocument(glob).then((results) => doc = results))

    it('expect schema to be a graphql schema', () => {
      expect(doc.kind).to.equal('Document')
    })
  })
})

describe('Combing Documents', () => {
  describe(`when loading glob with complete schema "${userGlob}"`, () => {
    let doc: DocumentNode
    let schema: GraphQLSchema
    before(() =>
      Promise.all([
        loadDocument(userGlob),
        loadDocument(glob),
      ]).then((results) => {
        doc = results[0]
        schema = combineDocuments(results)
      }))

    it('expect schema to be a graphql schema', () => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
    })
  })
      })

describe('Build Executable Schema From GraphQL Modules', () => {
  describe(`when preloading documents`, () => {
    let schema: GraphQLSchema
    before(() =>
      Promise.all([
        loadDocument(userGlob),
        loadDocument(glob),
      ]).then((results) => {
        const modules = results.map((document) => ({ document, resolvers: {} }))
        return executableSchemaFromModules(modules).then((execSchema) => schema = execSchema)
      }))

    it('expect schema to be a graphql schema', () => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
    })
  })

  describe(`when providing array of functions`, () => {
    let schema: GraphQLSchema
    before(() =>
      Promise.all([
        loadDocument(userGlob),
        loadDocument(glob),
      ]).then((results) => {
        const modules = results.map((document) => () => ({ document, resolvers: {} }))
        return executableSchemaFromModules(modules).then((execSchema) => schema = execSchema)
      }))

    it('expect schema to be a graphql schema', () => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
    })
  })

  describe(`when using promises`, () => {
    let schema: GraphQLSchema
    before(() => {
      const modules = [
        () => loadDocument(userGlob).then((document) => ({ document, resolvers: {}})),
        () => loadDocument(glob).then((document) => ({ document })),
      ]
      return executableSchemaFromModules(modules).then((execSchema) => schema = execSchema)
    })

    it('expect schema to be a graphql schema', () => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
    })
  })
})
