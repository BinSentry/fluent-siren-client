describe('Client', function () {
  const Client = require('../index');

  function requestFn(href, method, fieldValues) {
    if (href === 'http://external.website.com') {
      return {
        body: {
          properties: {
            name: 'external'
          }
        },
        contentType: 'application/vnd.siren+json',
        response: {
          statusCode: 200
        },
      };
    }
    if (href === 'http://api.example.com/entity') {
      return {
        body: {
          properties: {
            name: 'entity'
          }
        },
        contentType: 'application/vnd.siren+json',
        response: {
          statusCode: 200
        },
      };
    }
    if (href === 'http://api.example.com/action') {
      return {
        body: {
          properties: {
            name: 'action'
          }
        },
        contentType: 'application/vnd.siren+json',
        response: {
          statusCode: 201
        },
      };
    }
    if (href === 'http://api.example.com') {
      return {
        body: {
          properties: {
            name: 'api'
          },
          links: [{
            rel: ['external'],
            href: 'http://external.website.com',
          }],
          entities: [{
            rel: ['item'],
            links: [{
              rel: ['self'],
              href: 'http://api.example.com/entity',
            }],
          }],
          actions: [{
            name: 'action',
            href: 'http://api.example.com/action',
          }],
        },
        contentType: 'application/vnd.siren+json',
        response: {
          statusCode: 200
        },
      };
    }
    if (href === 'http://api.example.com/action-with-hidden-object-fields') {
      return {
        body: {
          properties: {
            name: 'api',
            fieldValues,
          },
          links: [{
            rel: ['external'],
            href: 'http://external.website.com',
          }],
          entities: [{
            rel: ['item'],
            links: [{
              rel: ['self'],
              href: 'http://api.example.com/entity',
            }],
          }],
          actions: [{
            name: 'action',
            href: 'http://api.example.com/action-with-hidden-object-fields',
            method: 'POST',
            fields: [{
              name: 'base[level1][level2]',
              type: 'hidden',
              value: 'from-hidden',
            }],
          }],
        },
        contentType: 'application/vnd.siren+json',
        response: {
          statusCode: 200
        },
      };
    }

    return {};
  }

  describe('#start()', function () {
    it('should start the client', async () => {
      const client = new Client(requestFn);
      const entity = await client.start('http://api.example.com');
      expect(entity.properties.name).to.equal('api');
      expect(entity.getResponse()).to.eql({ statusCode: 200 });
    });
  });

  describe('#perform()', function () {
    it('should perform request', async () => {
      const client = new Client(requestFn);
      const entity = await client.perform('http://api.example.com', 'GET');
      expect(entity.properties.name).to.equal('api');
    });
  });

  describe('#link.follow()', function () {
    it('should follow a link', async () => {
      const client = new Client(requestFn);
      const entity = await client.start('http://api.example.com');
      const linkedEntity = await entity.getLinkByRel('external').follow();
      expect(linkedEntity.properties.name).to.equal('external');
    });
  });

  describe('#entity.follow()', function () {
    it('should follow entity self link', async () => {
      const client = new Client(requestFn);
      const entity = await client.start('http://api.example.com');
      const subEntity = await entity.getSubEntity('item').follow();
      expect(subEntity.properties.name).to.equal('entity');
    });
  });

  describe('#action.perform()', function () {
    it('should perform actions', async () => {
      const client = new Client(requestFn);
      const entity = await client.start('http://api.example.com');
      const actionResult = await entity.getActionByName('action').perform();
      expect(actionResult.properties.name).to.equal('action');
      expect(actionResult.getResponse()).to.eql({ statusCode: 201 });
    });
    it('should pull in nested hidden fields', async () => {
      const client = new Client(requestFn);
      const entity = await client.start('http://api.example.com/action-with-hidden-object-fields');
      const actionResult = await entity.getActionByName('action').perform({
        base: { alternate: 'test' }
      });
      expect(actionResult.properties).to.eql({
        "fieldValues": {
          "base": {"alternate": "test"},
          "base[level1][level2]": "from-hidden"
        },
        "name": "api"
      });
    });
    it('should ignore nested hidden fields when includeHiddenFields is false', async () => {
      const client = new Client(requestFn);
      const entity = await client.start('http://api.example.com/action-with-hidden-object-fields');
      const actionResult = await entity.getActionByName('action').perform({
        base: { alternate: 'test' }
      }, { includeHiddenFields: false });
      expect(actionResult.properties).to.eql({
        "fieldValues": {
          "base": {"alternate": "test"},
        },
        "name": "api"
      });
    });
  });

  describe('options', () => {
    describe('originWhitelist', function () {
      it('should allow whitelisted origin provided as a string', async () => {
        const client = new Client(requestFn, { originWhitelist: 'http://api.example.com' });
        expect(await client.start('http://api.example.com')).to.not.be.undefined;
        expect(await client.perform('http://api.example.com')).to.not.be.undefined;
      });
      it('should allow whitelisted origin provided as an array', async () => {
        const client = new Client(requestFn, { originWhitelist: ['http://api.example.com'] });
        expect(await client.start('http://api.example.com')).to.not.be.undefined;
        expect(await client.perform('http://api.example.com')).to.not.be.undefined;
      });
      it('should block not whitelisted origin', async () => {
        const client = new Client(requestFn, { originWhitelist: 'http://api.example.com' });
        await expect(client.start('http://some.other.origin.com')).to.be.rejectedWith(Error);
        await expect(client.perform('http://some.other.origin.com')).to.be.rejectedWith(Error);
      });
      it('should be ignored when following external links', async () => {
        const client = new Client(requestFn, { originWhitelist: 'http://api.example.com' });
        const entity = await client.start('http://api.example.com');
        const externalLink = entity.getLinkByRel('external');
        expect(externalLink.href).to.equal('http://external.website.com');
        const externalEntity = await externalLink.follow();
        expect(externalEntity.properties.name).to.equal('external');
      });
    });
  });
});
