// Node-RED 3.x NodeAPI (with httpAdmin / auth) comes from 'node-red' types
// eslint-disable-next-line @typescript-eslint/no-require-imports
import type NodeRed from 'node-red';
import { NodeDef, Node } from '@node-red/registry';

type NodeAPI = NodeRed.NodeAPI;

interface PresetItem {
  label: string;
  value: unknown;
  valueType?: string;
  fullMsg?: boolean;
}

interface InteractiveInjectConfig extends NodeDef {
  mode?: 'slider' | 'presets';
  minValue?: number;
  maxValue?: number;
  step?: number;
  defaultValue?: number;
  currentValue?: number;
  topic?: string;
  outputProperty?: string;
  presets?: PresetItem[];
  outputAsJsonata?: boolean;
  outputJsonata?: string;
}

interface InteractiveInjectNode extends Node {
  mode: 'slider' | 'presets';
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  topic: string;
  outputProperty: string;
  presets: PresetItem[];
  outputAsJsonata: boolean;
  outputJsonata: string;
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
      const body = req.body as { value?: unknown };
      if (body.value !== undefined) {
        const v = Number(body.value);
        if (!isNaN(v)) {
          node.currentValue = clamp(v, node.minValue, node.maxValue);
        }
      }
      const msg: Record<string, unknown> = { topic: node.topic };

      if (node.mode === 'slider' && node.outputAsJsonata && node.outputJsonata) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let expr: any;
        try {
          expr = (RED.util as any).prepareJSONataExpression(node.outputJsonata, node);
          expr.assign('value', node.currentValue);
        } catch (err) {
          node.status({ fill: 'red', shape: 'ring', text: 'JSONata error' });
          res.status(400).send(String(err));
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (RED.util as any).evaluateJSONataExpression(expr, msg, (err: Error | null, result: unknown) => {
          if (err) {
            node.status({ fill: 'red', shape: 'ring', text: 'JSONata error' });
            res.status(400).send(String(err));
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (RED.util as any).setMessageProperty(msg, node.outputProperty, result);
          node.send(msg);
          node.status({ fill: 'green', shape: 'dot', text: String(node.currentValue) });
          res.json({ value: node.currentValue });
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (RED.util as any).setMessageProperty(msg, node.outputProperty, node.currentValue);
      node.send(msg);
      node.status({ fill: 'green', shape: 'dot', text: String(node.currentValue) });
      res.json({ value: node.currentValue });
    }
  );

  RED.httpAdmin.post(
    '/interactive-inject/:id/preset',
    RED.auth.needsPermission('interactive-inject.write'),
    (req, res) => {
      const node = RED.nodes.getNode(String(req.params['id'])) as InteractiveInjectNode | null;
      if (!node) {
        res.status(404).send('Not found');
        return;
      }
      const body = req.body as { index?: unknown };
      const index = Number(body.index);
      if (!Number.isInteger(index) || index < 0 || index >= node.presets.length) {
        res.status(400).send('Invalid index');
        return;
      }
      const preset = node.presets[index];
      const rawValue = (typeof preset.value === 'object' && preset.value !== null)
        ? JSON.stringify(preset.value)
        : String(preset.value ?? '');
      const valueType = preset.valueType || 'str';
      const effectiveLabel = preset.label || (
        valueType === 'flow'   ? 'flow.'   + rawValue :
        valueType === 'global' ? 'global.' + rawValue :
        rawValue
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (RED.util as any).evaluateNodeProperty(rawValue, valueType, node, { label: effectiveLabel }, (err: Error | null, result: unknown) => {
        if (err) { res.status(500).send(String(err)); return; }
        let msg: Record<string, unknown>;
        if (preset.fullMsg && typeof result === 'object' && result !== null) {
          msg = result as Record<string, unknown>;
        } else {
          msg = { topic: node.topic, label: effectiveLabel };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (RED.util as any).setMessageProperty(msg, node.outputProperty, result);
        }
        node.send(msg);
        let displayVal: string;
        if (valueType === 'flow') {
          displayVal = 'flow.' + rawValue;
        } else if (valueType === 'global') {
          displayVal = 'global.' + rawValue;
        } else {
          displayVal = typeof result === 'object' ? JSON.stringify(result) : String(result);
        }
        node.status({ fill: 'green', shape: 'dot', text: effectiveLabel + ': ' + displayVal.slice(0, 30) });
        res.json({ label: preset.label, value: result });
      });
    }
  );

  function InteractiveInjectNode(
    this: InteractiveInjectNode,
    config: InteractiveInjectConfig
  ) {
    RED.nodes.createNode(this, config);

    this.mode = config.mode ?? 'slider';
    this.minValue = config.minValue ?? 0;
    this.maxValue = config.maxValue ?? 100;
    this.step = config.step ?? 1;
    this.topic = config.topic ?? '';
    this.outputProperty = config.outputProperty ?? 'payload';
    this.presets = config.presets ?? [];
    this.outputAsJsonata = config.outputAsJsonata === true;
    this.outputJsonata = config.outputJsonata ?? '$value';
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
