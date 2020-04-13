# fluent-siren-client
Fluent client for Siren Hyper Media APIs

Fetches a [Siren](https://github.com/kevinswiber/siren) object from the given href and parses it into a
[node-siren-parser](https://github.com/Brightspace/node-siren-parser) Entity. 
Configures the Entity in such a way that uri links can be followed, and actions can be performed. Result of 
following a link is another fluent Entity.

## Installation

Install from NPM:
```shell
npm install fluent-siren-client
```

## Usage

```javascript
describe('SirenClient', () => {
  const SirenClient = require('fluent-siren-client');

  function requestFn(href, method, fieldValues) {
    if (href === 'http://external.website.com') {
      return {
        body: { properties: { name: 'external' } },
        contentType: 'application/vnd.siren+json',
      };
    }
    if (href === 'http://api.example.com/entity') {
      return {
        body: { properties: { name: 'entity' } },
        contentType: 'application/vnd.siren+json',
      };
    }
    if (href === 'http://api.example.com/action') {
      return {
        body: { properties: { name: 'action' } },
        contentType: 'application/vnd.siren+json',
      };
    }
    if (href === 'http://api.example.com') {
      return {
        body: {
          properties: { name: 'api' },
          links: [{ rel: ['external'], href: 'http://external.website.com' }],
          entities: [{
            rel: ['item'],
            links: [{ rel: ['self'], href: 'http://api.example.com/entity' }],
          }],
          actions: [{ name: 'action', href: 'http://api.example.com/action' }],
        },
        contentType: 'application/vnd.siren+json',
      };
    }
    return {};
  }

  it('follows links and performs actions', async () => {
    const client = new SirenClient(requestFn);
    const entity = await client.start('http://api.example.com');
    const linkedEntity = await entity.getLinkByRel('external').follow();
    const subEntity = await entity.getSubEntity('item').follow();
    const actionResult = await entity.getActionByName('action').perform();
  });
})
```
