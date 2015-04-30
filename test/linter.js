var assert = require('assert'),
    fs = require('fs'),

    defaults = require('../src/defaults.json'),
    Linter = require('../src/linter.js'),

    failing,
    passing,
    rules,

    ramllint = new Linter();

/* NOTE: these are in priority order of nesting within a RAML document */
failing = [
  'root',
  'resource',
  'method',
  'response'
].map(function (sect) {
  // turn the above list, of strings, into objects with document contents available
  return {
    doc: fs.readFileSync('./test/samples/failing-$.raml'.replace('$', sect), 'utf8'),
    name: sect
  };
}, {});

// this document will evolve as new rules are added but will always be valid.
passing = fs.readFileSync('./test/samples/passing.raml', 'utf8');

// make an object the is helpful in automated testing; below.
rules = Object.keys(defaults)
  .reduce(function (acc, sect) {
    acc[sect] = defaults[sect]
      .map(function (opt) {

        return opt.id;
      });

    return acc;
  }, {});

function hasError(haystack, needle) {
  var result;

  result = haystack
    .some(function (entry) {

      return entry.rule.id || entry.rule === needle;
    });

  return result;
}

describe('RAML Linter', function () {
  it('should be an object', function () {
    assert.equal('object', typeof ramllint);
  });

  it('should fail with parse_error', function () {
    // async
    return ramllint.lint('', function (log) {
      assert(hasError(log, 'parse_error'));
    });
  });

  failing
    .forEach(function (section) {
      var doc = section.doc;

      section = section.name;

      it('should fail in ' + section, function (done) {
        ramllint.lint(doc, function (report) {
          try {
            // 1. (positive) check that all defined rules for section are not passing
            rules[section]
              .forEach(function (rule) {
                assert(hasError(report, rule), 'The error log should include an error for: ' + rule);
              });

            // 2. (negative) check that no other errors are reported for section
            assert.equal(report.length, rules[section].length, 'Length of error report does not match expected length.');

            // 3. (negative) check that errors for previous sections are not reported

            done(); // async
          } catch (e) {
            //console.log(doc + '\n~~~~~~~~~\n', report);
            done(e); // this is stupid (node)assert/mochajs
          }
        });
      });
    });
});
