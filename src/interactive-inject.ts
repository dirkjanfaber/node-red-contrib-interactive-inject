// Node-RED 3.x NodeAPI (with httpAdmin / auth) comes from 'node-red' types
// eslint-disable-next-line @typescript-eslint/no-require-imports
import type NodeRed from 'node-red';
import { NodeDef, Node } from '@node-red/registry';

type NodeAPI = NodeRed.NodeAPI;

interface InteractiveInjectConfig extends NodeDef {
  label?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  defaultValue?: number;
}

interface InteractiveInjectNode extends Node {
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
}

interface IncomingMessage {
  trigger?: boolean;
  setValue?: number;
  [key: string]: unknown;
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
      node.send({ payload: node.currentValue });
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
    this.currentValue = clamp(
      config.defaultValue ?? this.minValue,
      this.minValue,
      this.maxValue
    );

    this.on('input', (msg: IncomingMessage) => {
      if (msg.setValue !== undefined) {
        this.currentValue = clamp(msg.setValue, this.minValue, this.maxValue);
        return;
      }

      if (msg.trigger) {
        this.send({ payload: this.currentValue });
      }
    });
  }

  RED.nodes.registerType('interactive-inject', InteractiveInjectNode as never);
}

export = interactiveInjectModule;
