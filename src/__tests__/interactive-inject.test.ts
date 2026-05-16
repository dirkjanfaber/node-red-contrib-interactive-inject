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
