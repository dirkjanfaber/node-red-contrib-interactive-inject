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

    it('outputs msg.payload with the configured default value when triggered', async () => {
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
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      await new Promise<void>((resolve) => {
        n2.on('input', (msg: { payload: unknown }) => {
          expect(msg.payload).toBe(42);
          resolve();
        });
        n1.receive({ trigger: true });
      });
    });

    it('outputs the current value (not default) after the value has been updated', async () => {
      const flow = [
        {
          id: 'n1',
          type: 'interactive-inject',
          name: 'test slider',
          minValue: 0,
          maxValue: 100,
          step: 1,
          defaultValue: 10,
          wires: [['n2']],
        },
        { id: 'n2', type: 'helper' },
      ];

      await helper.load(interactiveInjectNode, flow);
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      // Simulate the editor updating the current value (e.g. slider moved)
      n1.receive({ setValue: 75 });

      await new Promise<void>((resolve) => {
        n2.on('input', (msg: { payload: unknown }) => {
          expect(msg.payload).toBe(75);
          resolve();
        });
        n1.receive({ trigger: true });
      });
    });

    it('clamps received setValue to [min, max]', async () => {
      const flow = [
        {
          id: 'n1',
          type: 'interactive-inject',
          name: 'clamp test',
          minValue: 0,
          maxValue: 50,
          step: 1,
          defaultValue: 25,
          wires: [['n2']],
        },
        { id: 'n2', type: 'helper' },
      ];

      await helper.load(interactiveInjectNode, flow);
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n1.receive({ setValue: 999 });

      await new Promise<void>((resolve) => {
        n2.on('input', (msg: { payload: unknown }) => {
          expect(msg.payload).toBe(50);
          resolve();
        });
        n1.receive({ trigger: true });
      });
    });

    it('uses defaultValue when none of min/max/step/defaultValue are configured', async () => {
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
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      await new Promise<void>((resolve) => {
        n2.on('input', (msg: { payload: unknown }) => {
          expect(typeof msg.payload).toBe('number');
          resolve();
        });
        n1.receive({ trigger: true });
      });
    });
  });
});
