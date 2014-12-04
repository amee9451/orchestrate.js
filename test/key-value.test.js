// Copyright 2014 Orchestrate, Inc.
/**
 * @fileoverview Test Key-Value methods.
 */


// Module Dependencies.
var assert = require('assert');
var token = require('./creds').token;
var db = require('../lib-cov/client')(token);
var users = require('./testdata');
var util = require('util');

suite('Key-Value', function () {
  before(function(done) {
    users.reset(done);
  });

  test('Put/Get roundtrip', function (done) {
    db.put('users', users.steve_v0.email, users.steve_v0)
      .then(function (res) {
        assert.equal(201, res.statusCode);
        return db.get('users', users.steve_v0.email);
      })
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.deepEqual(users.steve_v0, res.body);
        done();
      })
      .fail(function (e) {
        done(e);
      });
  });

  test('Get by ref', function(done) {
    db.get('users', users.steve_v0.email, '0eb6642ca3efde45')
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.deepEqual(users.steve_v0, res.body);
        done();
      })
      .fail(function (e) {
        done(e);
      });
  });

  test('List refs for a key', function(done) {
    db.put('users', users.steve_v0.email, users.steve_v1)
      .then(function (res) {
        assert.equal(201, res.statusCode);
        return db.list_refs('users', users.steve_v0.email);
      })
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.equal(2, res.body.count);
        assert.equal("e85762917a99acce", res.body.results[0].path.ref);
        assert.equal("0eb6642ca3efde45", res.body.results[1].path.ref);
        done();
      })
    .fail(function (e) {
      done(e);
    });
  });

  test('Get list of values from a collection', function(done) {
    db.list('users', {limit:1})
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.equal(1, res.body.count);
        assert.deepEqual(users.david, res.body.results[0].value);
        assert.equal('/v0/users?limit=1&afterKey=byrd@bowery.io', res.body.next);
        return db.list('users', {limit:1, afterKey:users.david.email});
      })
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.equal(1, res.body.count);
        assert.deepEqual(users.steve_v1, res.body.results[0].value);
        assert.equal(undefined, res.body.next);
        return db.list('users', {limit:1, beforeKey:users.steve_v1.email});
      })
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.equal(1, res.body.count);
        assert.deepEqual(users.david, res.body.results[0].value);
        // There is no next in this situation, since there are only two values
        // in the collection and the beforeKey predicate has restricted the list
        // to only the first item
        assert.equal(undefined, res.body.next);
        done();
      })
    .fail(function (e) {
      done(e);
    });
  });

  test('Subdocument merge', function(done) {
    db.merge('users', users.steve_v1.email, {type: "consultant"})
      .then(function (res) {
        assert.equal(201, res.statusCode);
        return db.get('users', users.steve_v1.email);
      })
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.deepEqual(users.steve_v2, res.body);
        done();
      })
      .fail(function (e) {
        done(e);
      });
  });

  test('Subdocument patch', function(done) {
    db.newPatchBuilder('users', users.steve_v1.email)
      .add("type", "salaried")
      .copy("type", "paytype")
      .test("paytype", "salaried")
      .remove("paytype")
      .apply()
      .then(function (res) {
        assert.equal(201, res.statusCode);
        return db.get('users', users.steve_v1.email);
      })
      .then(function (res) {
        assert.equal(200, res.statusCode);
        assert.deepEqual(users.steve_v3, res.body);
        done();
      })
      .fail(function (e) {
        done(e);
      });
  });

  test('If-None-Match put', function(done) {
    db.put('users', users.david.email, users.david, false)
      .fail(function (res) {
        assert.equal(412, res.statusCode);
        return db.put('users', users.kelsey.email, users.kelsey, false);
      })
      .then(function (res) {
        assert.equal(201, res.statusCode);
        done();
      })
      .fail(function (e) {
        done(e);
      });
  });

  test('If-Match put', function(done) {
    db.put('users', users.kelsey.email, users.kelsey, 'badetag')
      .fail(function (res) {
        assert.equal(400, res.statusCode);
        return db.put('users', users.kelsey.email, users.kelsey_v1, 'c333c79ab9169d1f');
      })
    .then(function (res) {
      assert.equal(201, res.statusCode);
      done();
    })
    .fail(function (e) {
      done(e);
    });
  });
});

