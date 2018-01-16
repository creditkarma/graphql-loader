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

    it('expect schema to be a graphql schema', (done) => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
      done()
    })
  })

  describe(`when loading an invalid glob "${invalidGlob}"`, () => {
    it('expect error to be triggered', (done) => {
      const throws = () => { loadSchema.sync(invalidGlob) }
      expect( throws ).to.throw(GraphQLLoaderError, invalidGlobPattern)
      done()
    })
  })
  describe(`when loading glob with invalid schema ${invalidSchemaGlob}`, () => {
    it('expect schema errors to exist', (done) => {
      const throws = () => { loadSchema.sync(invalidSchemaGlob) }
      expect( throws ).to.throw(Error, invalidSchemaPattern)
      done()
    })
  })
})

describe('Schema Loader', () => {
  describe(`when loading glob with complete schema "${glob}"`, () => {
    let schema
    let cbSchema
    before((done) => {
      loadSchema(glob).then((results) => {
        schema = results
        loadSchema(glob, (err, cbResults) => {
          cbSchema = cbResults
          done()
        })
      })
    })

    it('expect schema to be a graphql schema', (done) => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
      done()
    })

    it('expect callback schema to be a graphql schema', (done) => {
      expect(cbSchema).to.exist()
      expect(cbSchema).to.be.an.instanceof(GraphQLSchema)
      done()
    })
  })

  describe(`when loading an invalid glob "${invalidGlob}"`, () => {
    let schemaErrors
    let cbSchemaErrors
    before((done) => {
      loadSchema(invalidGlob).catch((err) => {
        schemaErrors = err
        loadSchema(invalidGlob, (cbErr) => {
          cbSchemaErrors = cbErr
          done()
        })
      })
    })

    it('expect glob error to be triggered', (done) => {
      expect(schemaErrors).to.exist()
      expect(schemaErrors.message).to.match(invalidGlobPattern)
      done()
    })

    it('expect callbaack glob error to be triggered', (done) => {
      expect(cbSchemaErrors).to.exist()
      expect(cbSchemaErrors.message).to.match(invalidGlobPattern)
      done()
    })
  })

  describe(`when loading glob with invalid schema "${invalidSchemaGlob}"`, () => {
    let schemaErrors
    let cbSchemaErrors
    before((done) => {
      loadSchema(invalidSchemaGlob).catch((err) => {
        schemaErrors = err
        loadSchema(invalidSchemaGlob, (cbErr) => {
          cbSchemaErrors = cbErr
          done()
        })
      })
    })

    it('expect error to be invalidSchemaPattern', (done) => {
      expect(schemaErrors).to.exist()
      expect(schemaErrors).to.match(invalidSchemaPattern)
      done()
    })
    it('expect callback error to be invalidSchemaPattern', (done) => {
      expect(schemaErrors).to.exist()
      expect(schemaErrors).to.match(invalidSchemaPattern)
      done()
    })
  })

  describe('when loading glob with unreadable files', () => {
    const root = './fixtures/unreadable'
    const badGlob = `${root}/*.graphql`
    let results
    let cbResults
    before((done) => {
      mkdirp(root, () => {
        fs.writeFile(`${root}/schema.graphql`, 'hello', {mode: '333'}, (err) => {
          loadSchema(badGlob).catch((r) => {
            results = r
            loadSchema(badGlob, (cbr) => {
              cbResults = cbr
              rimraf(root, done)
            })
          })
        })
      })
    })

    it('expect error to exist', (done) => {
      expect(results).to.exist()
      done()
    })
    it('expect callback error to exist', (done) => {
      expect(cbResults).to.exist()
      done()
    })
  })
})

describe('Loading Document', () => {
  describe(`when loading glob with complete schema "${glob}"`, () => {
    let doc: DocumentNode
    before(() => loadDocument(glob).then((results) => doc = results))

    it('expect schema to be a graphql schema', (done) => {
      expect(doc).to.exist()
      expect(doc.kind).to.equal('Document')
      done()
    })
  })
})

describe('Combing Documents', () => {
  describe(`when loading glob with complete schema "${userGlob}"`, () => {
    let doc: DocumentNode
    let schema: GraphQLSchema
    before(() => {
      return Promise.all([
        loadDocument(userGlob),
        loadDocument(glob),
      ]).then((results) => {
        doc = results[0]
        schema = combineDocuments(results)
      })
    })

    it('expect schema to be a graphql schema', (done) => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
      done()
    })
  })
      })

describe('Build Executable Schema From GraphQL Modules', () => {
  describe(`when preloading documents`, () => {
    let schema: GraphQLSchema
    before(() => {
      return Promise.all([
        loadDocument(userGlob),
        loadDocument(glob),
      ]).then((results) => {
        const modules = results.map((document) => ({ document, resolvers: {} }))
        return executableSchemaFromModules(modules).then((execSchema) => schema = execSchema)
      })
    })

    it('expect schema to be a graphql schema', (done) => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
      done()
    })
  })

  describe(`when providing array of functions`, () => {
    let schema: GraphQLSchema
    before(() => {
      return Promise.all([
        loadDocument(userGlob),
        loadDocument(glob),
      ]).then((results) => {
        const modules = results.map((document) => () => ({ document, resolvers: {} }))
        return executableSchemaFromModules(modules).then((execSchema) => schema = execSchema)
      })
    })

    it('expect schema to be a graphql schema', (done) => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
      done()
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

    it('expect schema to be a graphql schema', (done) => {
      expect(schema).to.exist()
      expect(schema).to.be.an.instanceof(GraphQLSchema)
      done()
    })
  })
})
