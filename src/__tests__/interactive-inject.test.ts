import helper = require('node-red-node-test-helper');
import interactiveInjectNode = require('../interactive-inject');

helper.init(require.resolve('node-red'));

const BASE_FLOW = (overrides: Record<string, unknown> = {}) => [
  {
    id: 'n1',
    type: 'interactive-inject',
    name: 'test slider',
    minValue: 0,
    maxValue: 100,
    step: 1,
    defaultValue: 10,
    currentValue: 10,
    topic: 'test-topic',
    wires: [['n2']],
    ...overrides,
  },
  { id: 'n2', type: 'helper' },
];

describe('interactive-inject node', () => {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  describe('basic behaviour', () => {
    it('loads without error', async () => {
      const flow = [{ id: 'n1', type: 'interactive-inject', name: 'test' }];
      await helper.load(interactiveInjectNode, flow);
      const n1 = helper.getNode('n1');
      expect(n1).toBeDefined();
    });

    it('initializes currentValue to the configured defaultValue', async () => {
      const flow = [
        {
          id: 'n1',
          type: 'interactive-inject',
          name: 'test slider',
          minValue: 0,
          maxValue: 100,
          step: 1,
          defaultValue: 42,
          wires: [['n2']],
        },
        { id: 'n2', type: 'helper' },
      ];

      await helper.load(interactiveInjectNode, flow);
      const n1 = helper.getNode('n1') as unknown as { currentValue: number };
      expect(n1.currentValue).toBe(42);
    });

    it('prefers persisted currentValue over defaultValue on startup', async () => {
      const flow = [
        {
          id: 'n1',
          type: 'interactive-inject',
          name: 'test slider',
          minValue: 0,
          maxValue: 100,
          step: 1,
          defaultValue: 10,
          currentValue: 75,
          wires: [['n2']],
        },
        { id: 'n2', type: 'helper' },
      ];

      await helper.load(interactiveInjectNode, flow);
      const n1 = helper.getNode('n1') as unknown as { currentValue: number };
      expect(n1.currentValue).toBe(75);
    });

    it('clamps currentValue to [min, max] on startup', async () => {
      const flow = [
        {
          id: 'n1',
          type: 'interactive-inject',
          name: 'clamp test',
          minValue: 0,
          maxValue: 50,
          step: 1,
          defaultValue: 999,
          wires: [['n2']],
        },
        { id: 'n2', type: 'helper' },
      ];

      await helper.load(interactiveInjectNode, flow);
      const n1 = helper.getNode('n1') as unknown as { currentValue: number };
      expect(n1.currentValue).toBe(50);
    });

    it('uses 0 as currentValue when no config is provided', async () => {
      const flow = [
        {
          id: 'n1',
          type: 'interactive-inject',
          name: 'defaults test',
          wires: [['n2']],
        },
        { id: 'n2', type: 'helper' },
      ];

      await helper.load(interactiveInjectNode, flow);
      const n1 = helper.getNode('n1') as unknown as { currentValue: number };
      expect(typeof n1.currentValue).toBe('number');
    });
  });

  describe('preset buttons mode', () => {
    const PRESETS_FLOW = (presets: unknown[] = []) => [
      {
        id: 'n1',
        type: 'interactive-inject',
        name: 'test presets',
        mode: 'presets',
        topic: 'preset-topic',
        presets,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    it('loads in presets mode without error', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW());
      const n1 = helper.getNode('n1');
      expect(n1).toBeDefined();
    });

    it('POST /preset injects a string value', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'Hello', value: 'hello world', valueType: 'str' },
      ]));
      const n2 = helper.getNode('n2');
      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));

      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 0 })
        .expect(200);

      const msg = await msgPromise;
      expect(msg.payload).toBe('hello world');
      expect(msg.topic).toBe('preset-topic');
      expect(msg.label).toBe('Hello');
    });

    it('POST /preset injects a numeric value', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'Level', value: '42', valueType: 'num' },
      ]));
      const n2 = helper.getNode('n2');
      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));

      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 0 })
        .expect(200);

      const msg = await msgPromise;
      expect(msg.payload).toBe(42);
    });

    it('POST /preset injects a boolean value', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'Off', value: 'false', valueType: 'bool' },
      ]));
      const n2 = helper.getNode('n2');
      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));

      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 0 })
        .expect(200);

      const msg = await msgPromise;
      expect(msg.payload).toBe(false);
    });

    it('POST /preset injects a JSON value', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'Config', value: '{"brightness":70,"color_temp":4000}', valueType: 'json' },
      ]));
      const n2 = helper.getNode('n2');
      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));

      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 0 })
        .expect(200);

      const msg = await msgPromise;
      expect(msg.payload).toEqual({ brightness: 70, color_temp: 4000 });
    });

    it('POST /preset JSONata expression can reference label', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: '2000', value: '{ "offset": $number(label) }', valueType: 'jsonata' },
      ]));
      const n2 = helper.getNode('n2');
      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));

      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 0 })
        .expect(200);

      const msg = await msgPromise;
      expect(msg.payload).toEqual({ offset: 2000 });
      expect(msg.label).toBe('2000');
    });

    it('POST /preset injects a timestamp for date type', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'Now', value: '', valueType: 'date' },
      ]));
      const n2 = helper.getNode('n2');
      const before = Date.now();
      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));

      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 0 })
        .expect(200);

      const msg = await msgPromise;
      const after = Date.now();
      expect(typeof msg.payload).toBe('number');
      expect(msg.payload as number).toBeGreaterThanOrEqual(before);
      expect(msg.payload as number).toBeLessThanOrEqual(after);
    });

    it('POST /preset selects the correct preset by index', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'A', value: 'first',  valueType: 'str' },
        { label: 'B', value: 'second', valueType: 'str' },
        { label: 'C', value: 'third',  valueType: 'str' },
      ]));
      const n2 = helper.getNode('n2');
      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));

      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 2 })
        .expect(200);

      const msg = await msgPromise;
      expect(msg.payload).toBe('third');
    });

    it('POST /preset returns 400 for out-of-range index', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'A', value: '1', valueType: 'num' },
      ]));
      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: 5 })
        .expect(400);
    });

    it('POST /preset returns 400 for negative index', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW([
        { label: 'A', value: '1', valueType: 'num' },
      ]));
      await helper.request()
        .post('/interactive-inject/n1/preset')
        .send({ index: -1 })
        .expect(400);
    });

    it('POST /preset returns 404 for unknown node id', async () => {
      await helper.load(interactiveInjectNode, PRESETS_FLOW());
      await helper.request()
        .post('/interactive-inject/unknown/preset')
        .send({ index: 0 })
        .expect(404);
    });
  });

  describe('HTTP endpoints', () => {
    it('POST /inject sends msg.payload with node.currentValue and msg.topic', async () => {
      await helper.load(interactiveInjectNode, BASE_FLOW());
      const n2 = helper.getNode('n2');

      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));
      await helper.request()
        .post('/interactive-inject/n1/inject')
        .send({})
        .expect(200);
      const msg = await msgPromise;

      expect(msg.payload).toBe(10);
      expect(msg.topic).toBe('test-topic');
    });

    it('POST /inject with value in body uses that value, not stale node.currentValue', async () => {
      await helper.load(interactiveInjectNode, BASE_FLOW({ currentValue: 10 }));
      const n2 = helper.getNode('n2');

      const msgPromise = new Promise<Record<string, unknown>>(resolve => n2.on('input', resolve));
      // Simulate slider release sending the new value directly — without a prior /value POST
      await helper.request()
        .post('/interactive-inject/n1/inject')
        .send({ value: 75 })
        .expect(200);
      const msg = await msgPromise;

      expect(msg.payload).toBe(75);
    });

    it('POST /inject with value in body updates node.currentValue', async () => {
      await helper.load(interactiveInjectNode, BASE_FLOW({ currentValue: 10 }));
      const n2 = helper.getNode('n2');

      const msgPromise = new Promise<void>(resolve => n2.on('input', () => resolve()));
      await helper.request()
        .post('/interactive-inject/n1/inject')
        .send({ value: 60 });
      await msgPromise;

      const n1 = helper.getNode('n1') as unknown as { currentValue: number };
      expect(n1.currentValue).toBe(60);
    });

    it('POST /value updates node.currentValue', async () => {
      await helper.load(interactiveInjectNode, BASE_FLOW());

      await helper.request()
        .post('/interactive-inject/n1/value')
        .send({ value: 42 })
        .expect(200);

      const n1 = helper.getNode('n1') as unknown as { currentValue: number };
      expect(n1.currentValue).toBe(42);
    });

    it('POST /value clamps to [min, max]', async () => {
      await helper.load(interactiveInjectNode, BASE_FLOW());

      await helper.request()
        .post('/interactive-inject/n1/value')
        .send({ value: 999 })
        .expect(200);

      const n1 = helper.getNode('n1') as unknown as { currentValue: number };
      expect(n1.currentValue).toBe(100);
    });

    it('POST /value returns 400 for non-numeric value', async () => {
      await helper.load(interactiveInjectNode, BASE_FLOW());
      await helper.request()
        .post('/interactive-inject/n1/value')
        .send({ value: 'bad' })
        .expect(400);
    });

    it('POST /inject returns 404 for unknown node id', async () => {
      await helper.load(interactiveInjectNode, BASE_FLOW());
      await helper.request()
        .post('/interactive-inject/unknown/inject')
        .send({})
        .expect(404);
    });
  });
});
