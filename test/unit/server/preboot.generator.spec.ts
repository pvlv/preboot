import 'reflect-metadata';
import 'jasmine';
import {
  stringifyWithFunctions,
  assign,
  validateOptions,
  generatePrebootEventRecorderCode,
  PrebootRecordOptions
} from '../../../src';
import { getMockWindow } from '../../utils';

describe('UNIT TEST preboot.generator', function() {
  describe('stringifyWithFunctions()', function() {
    it('should do the same thing as stringify if no functions', function
    () {
      const obj = { foo: 'choo', woo: 'loo', zoo: 5 };
      const expected = JSON.stringify(obj);
      const actual = stringifyWithFunctions(obj);
      expect(actual).toEqual(expected);
    });

    it('should stringify an object with functions', function() {
      const obj = {
        blah: 'foo',
        zoo: function(blah: number) {
          return blah + 1;
        }
      };
      const expected = '{"blah":"foo","zoo":function (';
      const actual = stringifyWithFunctions(obj);
      expect(actual.substring(0, 30)).toEqual(expected);
    });
  });

  describe('assign()', function() {
    it('should merge two objects', function () {
      const obj1 = { val1: 'foo', val2: 'choo' };
      const obj2 = {val2: 'moo', val3: 'zoo'};
      const expected = {val1: 'foo', val2: 'moo', val3: 'zoo'};
      const actual = assign(obj1, obj2);
      expect(actual).toEqual(expected);
    });
  });

  describe('validateOptions()', function() {
    it('should throw error if nothing passed in', function() {
      expect(() => validateOptions({} as PrebootRecordOptions)).toThrowError(/appRoot is missing/);
    });
  });

  describe('generatePrebootEventRecorderCode()', function() {
    it('should generate valid JavaScript by default', function() {
      const code = generatePrebootEventRecorderCode({ appRoot: 'app' });
      expect(code).toBeTruthy();
    });
  });
});
