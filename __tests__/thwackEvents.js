import thwack from '../src';
import ThwackResponseEvent from '../src/ThwackEvents/ThwackResponseEvent';
import ThwackRequestEvent from '../src/ThwackEvents/ThwackRequestEvent';

import {
  createMockFetch,
  fooBarData,
  defaultBaseUrl,
  defaultFetchOptions,
  mergeDefaults,
} from '../jestUtils';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Thwack events', () => {
  describe('calling addEventListener("request")', () => {
    it('has its callback called with options before calling fetch', async () => {
      const fetch = createMockFetch();
      const callback = jest.fn();
      const options = {
        url: 'foo',
        fetch,
        foo: 'bar',
      };
      thwack.addEventListener('request', callback);
      const data = await thwack(options);
      thwack.removeEventListener('request', callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toBeCalledWith(expect.any(ThwackRequestEvent));
      expect(fetch).toBeCalledWith(`${defaultBaseUrl}foo`, defaultFetchOptions);
      expect(data).toEqual({
        data: fooBarData,
        options: mergeDefaults(options),
        headers: {
          'content-type': 'application/json',
        },
        status: 200,
        ok: true,
        statusText: 'ok',
        response: fetch.response,
      });
    });
    it('callbacks can alter options', async () => {
      const fetch = createMockFetch();
      const callback = (event) => {
        event.options = { ...event.options, url: 'bob' };
      };
      const options = {
        url: 'foo',
        fetch,
        foo: 'bar',
      };
      thwack.addEventListener('request', callback);
      await thwack(options);
      thwack.removeEventListener('request', callback);
      expect(fetch).toBeCalledWith(`${defaultBaseUrl}bob`, defaultFetchOptions);
    });
    it('async callbacks can alter options', async () => {
      const fetch = createMockFetch();
      const callback = async (event) => {
        await sleep(100);
        event.options = { ...event.options, url: 'bob' };
      };
      const options = {
        url: 'foo',
        fetch,
        foo: 'bar',
      };
      thwack.addEventListener('request', callback);
      await thwack(options);
      thwack.removeEventListener('request', callback);
      expect(fetch).toBeCalledWith(`${defaultBaseUrl}bob`, defaultFetchOptions);
    });
    it('can be called multiple times and see the effects from the other callbacks', async () => {
      const fetch = createMockFetch();
      const callback1 = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}bar` };
      });
      const callback2 = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}bar` };
      });
      thwack.addEventListener('request', callback1);
      thwack.addEventListener('request', callback2);
      await thwack('foo', {
        fetch,
        foo: 'bar',
      });
      thwack.removeEventListener('request', callback2);
      thwack.removeEventListener('request', callback1);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(fetch).toBeCalledWith(
        `${defaultBaseUrl}foobarbar`,
        defaultFetchOptions
      );
    });
    it('a callback can call stopPropagation() to prevent additional callbacks from executing', async () => {
      const fetch = createMockFetch();
      const callback1 = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}bar` };
        e.stopPropagation();
      });
      const callback2 = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}bar` };
      });
      thwack.addEventListener('request', callback1);
      thwack.addEventListener('request', callback2);
      await thwack('foo', {
        fetch,
        foo: 'bar',
      });
      thwack.removeEventListener('request', callback2);
      thwack.removeEventListener('request', callback1);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);
      expect(fetch).toBeCalledWith(
        `${defaultBaseUrl}foobar`,
        defaultFetchOptions
      );
    });
    it('exceptions in callbacks make it out to the process what called request', async () => {
      const fetch = createMockFetch();
      const callback1 = jest.fn(() => {
        throw new Error('boo!');
      });
      const callback2 = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}bar` };
      });
      thwack.addEventListener('request', callback1);
      thwack.addEventListener('request', callback2);
      try {
        await thwack('foo', {
          fetch,
          foo: 'bar',
        });
      } catch (ex) {
        expect(ex.toString()).toBe('Error: boo!');
      }
      thwack.removeEventListener('request', callback2);
      thwack.removeEventListener('request', callback1);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);
      expect(fetch).toHaveBeenCalledTimes(0);
    });
    it('parent events happen before child events and a stopPropagation on the parent stops child events', async () => {
      const fetch = createMockFetch();
      const instance = thwack.create();
      const callback1 = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}bar` };
        e.stopPropagation();
      });
      const callback2 = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}bar` };
      });
      thwack.addEventListener('request', callback1);
      instance.addEventListener('request', callback2);
      await instance('foo', {
        fetch,
        foo: 'bar',
      });
      instance.removeEventListener('request', callback2);
      thwack.removeEventListener('request', callback1);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);
      expect(fetch).toBeCalledWith(
        `${defaultBaseUrl}foobar`,
        defaultFetchOptions
      );
    });

    it('multiple parent events happen before child events', async () => {
      const fetch = createMockFetch();
      const instanceb = thwack.create();
      const instancec = instanceb.create();
      const callbacka = (e) => {
        e.options = { ...e.options, url: `${e.options.url}/a` };
      };
      const callbackb = (e) => {
        e.options = { ...e.options, url: `${e.options.url}/b` };
      };
      const callbackc = (e) => {
        e.options = { ...e.options, url: `${e.options.url}/c` };
      };
      thwack.addEventListener('request', callbacka);
      instanceb.addEventListener('request', callbackb);
      instancec.addEventListener('request', callbackc);
      await instancec('foo', {
        fetch,
        foo: 'bar',
      });
      instancec.removeEventListener('request', callbackc);
      instanceb.removeEventListener('request', callbackb);
      thwack.removeEventListener('request', callbacka);
      expect(fetch).toBeCalledWith(
        `${defaultBaseUrl}foo/a/b/c`,
        defaultFetchOptions
      );
    });
    it('events can be async and multiple parent events happen before child events', async () => {
      const fetch = createMockFetch();
      const instanceb = thwack.create();
      const instancec = instanceb.create();
      const callbacka = async (e) => {
        e.options = { ...e.options, url: `${e.options.url}/a` };
      };
      const callbackb = async (e) => {
        await sleep(100);
        e.options = { ...e.options, url: `${e.options.url}/b` };
      };
      const callbackc = (e) => {
        e.options = { ...e.options, url: `${e.options.url}/c` };
      };
      thwack.addEventListener('request', callbacka);
      instanceb.addEventListener('request', callbackb);
      instancec.addEventListener('request', callbackc);
      await instancec('foo', {
        fetch,
        foo: 'bar',
      });
      instancec.removeEventListener('request', callbackc);
      instanceb.removeEventListener('request', callbackb);
      thwack.removeEventListener('request', callbacka);
      expect(fetch).toBeCalledWith(
        `${defaultBaseUrl}foo/a/b/c`,
        defaultFetchOptions
      );
    });
    it('multiple parent events happen before child events and a stopPropagation on the parent stops child events', async () => {
      const fetch = createMockFetch();
      const instanceb = thwack.create();
      const instancec = instanceb.create();
      const callbacka = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}/a` };
        e.stopPropagation();
      });
      const callbackb = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}/b` };
      });
      const callbackc = jest.fn((e) => {
        e.options = { ...e.options, url: `${e.options.url}/c` };
      });
      thwack.addEventListener('request', callbacka);
      instanceb.addEventListener('request', callbackb);
      instancec.addEventListener('request', callbackc);
      await instancec('foo', {
        fetch,
        foo: 'bar',
      });
      instancec.removeEventListener('request', callbackc);
      instanceb.removeEventListener('request', callbackb);
      thwack.removeEventListener('request', callbacka);
      expect(callbacka).toHaveBeenCalledTimes(1);
      expect(callbackb).toHaveBeenCalledTimes(0);
      expect(callbackc).toHaveBeenCalledTimes(0);
      expect(fetch).toBeCalledWith(
        `${defaultBaseUrl}foo/a`,
        defaultFetchOptions
      );
    });
    it('a callback can call preventDefault() to prevent the fetch from happening', async () => {
      const fetch = createMockFetch();
      const callback = async (e) => {
        // e.promise = Promise.resolve('preventDefault');
        e.preventDefault();
        return 'preventDefault';
      };
      thwack.addEventListener('request', callback);
      const resp = await thwack('foo', {
        fetch,
        foo: 'bar',
      });
      thwack.removeEventListener('request', callback);
      expect(fetch).toHaveBeenCalledTimes(0);
      expect(resp).toEqual('preventDefault');
    });
  });

  describe('calling addEventListener("response")', () => {
    it('has its callback called with options before calling fetch', async () => {
      const fetch = createMockFetch();
      const callback = jest.fn();
      const options = {
        url: 'foo',
        fetch,
        foo: 'bar',
      };
      thwack.addEventListener('response', callback);
      await thwack(options);
      thwack.removeEventListener('response', callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toBeCalledWith(expect.any(ThwackResponseEvent));
      expect(callback).toBeCalledWith(
        expect.objectContaining({
          thwackResponse: {
            data: fooBarData,
            options: mergeDefaults(options),
            headers: {
              'content-type': 'application/json',
            },
            status: 200,
            ok: true,
            statusText: 'ok',
            response: fetch.response,
          },
        })
      );
    });
    it('a callback can call preventDefault() to prevent the fetch from happening', async () => {
      const fetch = createMockFetch();
      const callback = (e) => {
        // await sleep(100);
        e.preventDefault();
        return 'mock response';
      };
      thwack.addEventListener('response', callback);
      const resp = await thwack('foo', {
        fetch,
        foo: 'bar',
      });
      thwack.removeEventListener('response', callback);
      expect(resp).toEqual('mock response');
    });
    it('an async callback can call preventDefault() to prevent the fetch from happening', async () => {
      const fetch = createMockFetch();
      const callback = async (e) => {
        await sleep(100);
        e.preventDefault();
        return 'mock response';
      };
      thwack.addEventListener('response', callback);
      const resp = await thwack('foo', {
        fetch,
        foo: 'bar',
      });
      thwack.removeEventListener('response', callback);
      expect(resp).toEqual('mock response');
    });
  });

  describe('calling removeEventListener', () => {
    it('is properly removed', async () => {
      const fetch = createMockFetch();
      const callback = jest.fn();
      thwack.addEventListener('request', callback);
      await thwack('foo', { fetch });
      expect(callback).toHaveBeenCalledTimes(1);
      thwack.removeEventListener('request', callback);
      await thwack('foo', { fetch });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
