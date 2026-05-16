// Node-RED 3.x NodeAPI (with httpAdmin / auth) comes from 'node-red' types
// eslint-disable-next-line @typescript-eslint/no-require-imports
import type NodeRed from 'node-red';
import { NodeDef, Node } from '@node-red/registry';

type NodeAPI = NodeRed.NodeAPI;

interface InteractiveInjectConfig extends NodeDef {
  minValue?: number;
  maxValue?: number;
  step?: number;
  defaultValue?: number;
  currentValue?: number;
  topic?: string;
}

interface InteractiveInjectNode extends Node {
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  topic: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function interactiveInjectModule(RED: NodeAPI): void {
  // Admin HTTP endpoints called by the canvas slider/button
  RED.httpAdmin.post(
    '/interactive-inject/:id/value',
    RED.auth.needsPermission('interactive-inject.write'),
    (req, res) => {
      const node = RED.nodes.getNode(String(req.params['id'])) as InteractiveInjectNode | null;
      if (!node) {
        res.status(404).send('Not found');
        return;
      }
      const body = req.body as { value?: unknown };
      const v = Number(body.value);
      if (isNaN(v)) {
        res.status(400).send('Invalid value');
        return;
      }
      node.currentValue = clamp(v, node.minValue, node.maxValue);
      res.json({ value: node.currentValue });
    }
  );

  RED.httpAdmin.post(
    '/interactive-inject/:id/inject',
    RED.auth.needsPermission('interactive-inject.write'),
    (req, res) => {
      const node = RED.nodes.getNode(String(req.params['id'])) as InteractiveInjectNode | null;
      if (!node) {
        res.status(404).send('Not found');
        return;
      }
      node.send({ payload: node.currentValue, topic: node.topic });
      res.json({ value: node.currentValue });
    }
  );

  function InteractiveInjectNode(
    this: InteractiveInjectNode,
    config: InteractiveInjectConfig
  ) {
    RED.nodes.createNode(this, config);

    this.minValue = config.minValue ?? 0;
    this.maxValue = config.maxValue ?? 100;
    this.step = config.step ?? 1;
    this.topic = config.topic ?? '';
    // Prefer the persisted slider position; fall back to the configured default.
    this.currentValue = clamp(
      config.currentValue ?? config.defaultValue ?? this.minValue,
      this.minValue,
      this.maxValue
    );

  }

  RED.nodes.registerType('interactive-inject', InteractiveInjectNode as never);
}

export = interactiveInjectModule;
