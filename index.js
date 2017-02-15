const { writeFileSync } = require('fs')
const { join } = require('path')
const { assign, upperFirst } = require('lodash/fp')
const customRoutes = []

const mapGetOne = domain => ({
  summary: `Get a ${upperFirst(domain)}`,
  description: `The ${upperFirst(domain)} endpoint returns information about a ${upperFirst(domain)}`,
  parameters: [{
    name: 'id',
    in: 'path',
    description: `ID of the ${domain} to fetch`,
    required: true,
    type: 'integer'
  }],
  tags: [ upperFirst(domain) ],
  responses: {
    200: {
      description: `A single ${domain}`,
      schema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            schema: {
              $ref: `#/definitions/${upperFirst(domain)}`
            }
          }
        }
      }
    },
    404: {
      description: `${upperFirst(domain)} not found`
    },
    default: {
      description: 'Unexpected error'
    }
  }
})

const mapGetMany = domain => ({
  summary: `Get a list of ${upperFirst(domain)}s`,
  description: `The ${upperFirst(domain)}s endpoint returns information about ${upperFirst(domain)}s`,
  parameters: [{
    name: 'page',
    in: 'query',
    description: `The current page to get`,
    type: 'integer'
  }, {
    name: 'limit',
    in: 'query',
    description: `The number of records to get`,
    type: 'integer'
  }],
  tags: [ upperFirst(domain) ],
  responses: {
    200: {
      description: `An array of ${domain}`,
      schema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            properties: {
              records: {
                type: 'array',
                items: {
                  $ref: `#/definitions/${upperFirst(domain)}`
                }
              },
              total: {
                type: 'number'
              }
            }
          }
        }
      }
    },
    default: {
      description: 'Unexpected error'
    }
  }
})

const mapCreate = domain => ({
  summary: `Create a ${upperFirst(domain)}`,
  description: `Adds a new ${upperFirst(domain)} to the list`,
  parameters: [{
    name: 'body',
    in: 'body',
    description: `The ${domain} to create`,
    required: true,
    schema: {
      $ref: `#/definitions/${upperFirst(domain)}`
    }
  }],
  tags: [ upperFirst(domain) ],
  responses: {
    201: {
      description: `Successfully created ${domain}`,
      schema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            schema: {
              $ref: `#/definitions/${upperFirst(domain)}`
            }
          }
        }
      }
    },
    422: {
      description: 'Unprocessable Entity'
    },
    default: {
      description: 'Unexpected error'
    }
  }
})

const mapUpdate = domain => ({
  summary: `Update ${upperFirst(domain)}`,
  description: `Update an existing ${upperFirst(domain)}`,
  parameters: [{
    name: 'id',
    in: 'path',
    description: `ID of the ${domain} to update`,
    required: true,
    type: 'integer'
  }, {
    name: 'body',
    in: 'body',
    description: `The ${domain} to update`,
    schema: {
      $ref: `#/definitions/${upperFirst(domain)}`
    }
  }],
  tags: [ upperFirst(domain) ],
  responses: {
    200: {
      description: `Successfully updated ${domain}`,
      schema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            schema: {
              $ref: `#/definitions/${upperFirst(domain)}`
            }
          }
        }
      }
    },
    404: {
      description: `${upperFirst(domain)} not found`
    },
    422: {
      description: 'Unprocessable Entity'
    },
    default: {
      description: 'Unexpected error'
    }
  }
})

const mapDelete = domain => ({
  summary: `Deletes ${upperFirst(domain)}`,
  description: `Deletes an existing ${upperFirst(domain)}`,
  parameters: [{
    name: 'id',
    in: 'path',
    description: `ID of the ${domain} to delete`,
    required: true,
    type: 'integer'
  }],
  tags: [ upperFirst(domain) ],
  responses: {
    204: {
      description: `Successfully deleted ${domain}`
    },
    404: {
      description: `${upperFirst(domain)} not found`
    },
    default: {
      description: 'Unexpected error'
    }
  }
})

const generatePaths = domainNames =>
  domainNames.reduce((result, domain) => {
    result[`/${domain}`] = {
      get: mapGetMany(domain),
      post: mapCreate(domain)
    }

    result[`/${domain}/{id}`] = {
      get: mapGetOne(domain),
      delete: mapDelete(domain),
      put: mapUpdate(domain)
    }

    return result
  }, {})

const convertSwaggerType = type => {
  switch (type) {
    case 'number': return 'integer'
    case 'uuid':
    case 'email': return 'string'
    default: return type
  }
}

const generateDefinitions = domains =>
  Object.keys(domains).reduce((result, domain) => {
    const domainSchema = domains[domain].getSchema()
    result[upperFirst(domain)] = {
      type: 'object',
      properties: Object.keys(domainSchema).reduce((fieldResult, field) => {
        fieldResult[field] = Object.keys(domainSchema[field]).reduce((propResult, property) => {
          if (property === 'type') {
            propResult[property] = convertSwaggerType(domainSchema[field][property])

            if (domainSchema[field][property] === 'array') {
              propResult.type = 'array'
              propResult.items = { type: convertSwaggerType(domainSchema[field].of) }
            }

            return propResult
          }

          return propResult
        }, {})

        return fieldResult
      }, {})
    }

    result[upperFirst(domain)].properties[`${domain}id`] = { type: 'string' } // TODO: move to repository?
    result[upperFirst(domain)].properties.createdby = { type: 'string' }
    result[upperFirst(domain)].properties.updatedby = { type: 'string' }
    result[upperFirst(domain)].properties.createddate = { type: 'date' }
    result[upperFirst(domain)].properties.updateddate = { type: 'date' }
    result[upperFirst(domain)].properties.active = { type: 'boolean' }

    return result
  }, {})

const generateCustomRoutes = () => {

}

const writeDocs = (path, paths, definitions, options) => {
  const swagger = assign({
    swagger: '2.0',
    info: {
      title: 'title',
      description: 'description',
      version: '1.0.0'
    },
    host: 'localhost',
    schemes: [
      'https'
    ],
    basePath: '/',
    produces: [
      'application/json'
    ],
    paths,
    definitions
  }, options)

  console.log('Generating swagger.json...')
  writeFileSync(join(path, 'swagger.json'), JSON.stringify(swagger))
  console.log('Generatied swagger.json.')

  console.log('Generating spec.js...')
  writeFileSync(join(path, 'spec.js'), `var spec = ${JSON.stringify(swagger)}`)
  console.log('Generated spec.js...')
}

module.exports = {
  addCustomRoute (route) {
    customRoutes.push(route)
  },

  generateDocs (path, domains, options) {
    const paths = assign(generatePaths(Object.keys(domains)), generateCustomRoutes())
    const definitions = generateDefinitions(domains)

    writeDocs(path, paths, definitions, options)
  }
}
