import { minify } from 'uglify-js';
import { getNodeKeyForPreboot, PrebootRecordOptions } from '../common';
import * as eventRecorder from './event.recorder';

const inlineCodeCache: { [key: string]: string; } = {};

// exporting default options in case developer wants to use these + custom on
// top
export const defaultOptions = <PrebootRecordOptions>{
  buffer: true,
  minify: true,

  // these are the default events are are listening for an transfering from
  // server view to client view
  eventSelectors: [

    // for recording changes in form elements
    {
      selector: 'input,textarea',
      events: ['keypress', 'keyup', 'keydown', 'input', 'change']
    },
    {selector: 'select,option', events: ['change']},

    // when user hits return button in an input box
    {
      selector: 'input',
      events: ['keyup'],
      preventDefault: true,
      keyCodes: [13],
      freeze: true
    },

    // for tracking focus (no need to replay)
    {
      selector: 'input,textarea',
      events: ['focusin', 'focusout', 'mousedown', 'mouseup'],
      noReplay: true
    },

    // user clicks on a button
    {
      selector: 'input[type="submit"],button',
      events: ['click'],
      preventDefault: true,
      freeze: true
    }
  ]
};

/**
 * Main entry point for the server side version of preboot. The main purpose
 * is to generate inline code that can be inserted into the server view.
 *
 * @param customOptions PrebootRecordOptions that override the defaults
 * @returns {string} Generated inline preboot code is returned
 */
export function generatePrebootEventRecorderCode(customOptions?: PrebootRecordOptions): string {
  const opts = <PrebootRecordOptions>assign({}, defaultOptions, customOptions);

  // safety check to make sure options passed in are valid
  validateOptions(opts);

  // use cache if exists and user hasn't disabled the cache
  const optsKey = JSON.stringify(opts);
  if (inlineCodeCache[optsKey]) {
    return inlineCodeCache[optsKey];
  }

  // generate the inline preboot code that will be injected into the document
  const eventRecorderFunctions: string[] = [];
  for (const funcName in eventRecorder) {
    const fn = (<any>eventRecorder)[funcName].toString();
    const fnCleaned = fn.replace('common_1.', '');
    eventRecorderFunctions.push(fnCleaned);
  }

  // this is common function used to get the node key
  eventRecorderFunctions.push(getNodeKeyForPreboot.toString());

  const eventRecorderCode = '\n\n' + eventRecorderFunctions.join('\n\n') + '\n\n';
  const inlinePrebootCode = opts.minify ? minify(eventRecorderCode).code : eventRecorderCode;
  const optsStr = stringifyWithFunctions(opts, opts.minify);
  const inlineCode = `(function(){${inlinePrebootCode}init(${optsStr})})()`;

  // cache results and return
  inlineCodeCache[optsKey] = inlineCode;
  return inlineCode;
}

/**
 * Throw an error if issues with any options
 * @param opts
 */
export function validateOptions(opts: PrebootRecordOptions) {
  if (!opts.appRoot || !opts.appRoot.length) {
    throw new Error(
        'The appRoot is missing from preboot options. ' +
        'This is needed to find the root of your application. ' +
        'Set this value in the preboot options to be a selector for the root element of your app.');
  }
}

/**
 * Object.assign() is not fully supporting in TypeScript, so
 * this is just a simple implementation of it
 *
 * @param target The target object
 * @param optionSets Any number of addition objects that are added on top of the
 * target
 * @returns {Object} A new object that contains all the merged values
 */
export function assign(target: Object, ...optionSets: any[]): Object {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  const output = Object(target);
  for (let index = 0; index < optionSets.length; index++) {
    const source = optionSets[index];
    if (source !== undefined && source !== null) {
      for (const nextKey in source) {
        if (source.hasOwnProperty(nextKey)) {
          output[nextKey] = source[nextKey];
        }
      }
    }
  }

  return output;
}

/**
 * Stringify an object and include functions. This is needed since we are
 * letting users pass in options that include custom functions for things like
 * the freeze handler or action when an event occurs
 *
 * @param obj This is the object you want to stringify that includes some
 * functions
 * @param minify If false, JSON outputed with 2 char indents
 * @returns {string} The stringified version of an object
 */
export function stringifyWithFunctions(obj: Object, minify = true): string {
  const FUNC_START = 'START_FUNCTION_HERE';
  const FUNC_STOP = 'STOP_FUNCTION_HERE';
  const indent = minify ? undefined : 2;

  // first stringify except mark off functions with markers
  let str = JSON.stringify(obj, function(_key, value) {

    // if the value is a function, we want to wrap it with markers
    if (!!(value && value.constructor && value.call && value.apply)) {
      return FUNC_START + value.toString() + FUNC_STOP;
    } else {
      return value;
    }
  }, indent);

  // now we use the markers to replace function strings with actual functions
  let startFuncIdx = str.indexOf(FUNC_START);
  let stopFuncIdx: number;
  let fn: string;
  while (startFuncIdx >= 0) {
    stopFuncIdx = str.indexOf(FUNC_STOP);

    // pull string out
    fn = str.substring(startFuncIdx + FUNC_START.length, stopFuncIdx);
    fn = fn.replace(/\\n/g, '\n');

    str = str.substring(0, startFuncIdx - 1) + fn +
        str.substring(stopFuncIdx + FUNC_STOP.length + 1);
    startFuncIdx = str.indexOf(FUNC_START);
  }

  return str;
}
