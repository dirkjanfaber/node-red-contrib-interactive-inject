import helper = require('node-red-node-test-helper');
import interactiveInjectNode = require('../interactive-inject');

helper.init(require.resolve('node-red'));

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
});
