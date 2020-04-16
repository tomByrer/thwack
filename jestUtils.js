/* istanbul ignore file */
/* eslint-disable no-undef */
import { defaultOptions } from './src/defaults';
import deepSpreadOptions from './src/utils/deepSpreadOptions';
import 'core-js/features/array/flat';
import 'core-js/features/object/from-entries';
import 'core-js/features/array/entries';

export const { headers: defaultHeaders } = defaultOptions;
export const defaultBaseUrl = 'http://localhost/';
export const fooBarData = { foo: 'bar' };
export const defaultFetchOptions = {
  ...fooBarData,
  headers: defaultHeaders,
};

export const mergeDefaults = (options, defaults = defaultOptions) => {
  return deepSpreadOptions(defaults, options);
};

export const createMockFetch = (options = {}) => {
  const {
    status = 200,
    ok = true,
    statusText = 'ok',
    contentType = 'application/json',
    jsonResult = { foo: 'bar' },
    textResult = 'text',
    body = '(stream)',
  } = options;

  const response = {
    status,
    statusText,
    ok,
    headers: {
      entries: () => [['content-type', contentType]],
    },
    json: async () => jsonResult,
    text: async () => textResult,
    body,
  };
  const fetch = jest.fn(() => Promise.resolve(response));
  fetch.response = response;
  return fetch;
};
