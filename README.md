# node-red-contrib-interactive-inject

A Node-RED node that renders an interactive slider **directly on the editor canvas** — no dashboard required. Drag the thumb or type a value directly to set a number; release (or press Enter, or click the button) to inject it into your flow.

<img src="https://raw.githubusercontent.com/dirkjanfaber/node-red-contrib-interactive-inject/main/docs/screenshot.png" alt="interactive-inject node on the Node-RED canvas" width="382">

## Features

- Inline `<input type="range">` slider embedded in the node body via SVG `<foreignObject>`
- Editable value display — drag the slider or click the number and type directly; press **Enter** to commit or **Escape** to cancel
- **Inject on release** — automatically sends `msg.payload` when the slider thumb is released (can be disabled)
- Left-side inject button for manual triggering, like the built-in Inject node
- Slider position persisted to `flows.json` — survives deploy and restart
- Configurable label, topic, min, max, step, and default value
- Works with Node-RED 3.x and above; no dependency on node-red-dashboard

## Installation

Install from your Node-RED user directory (typically `~/.node-red`):

```bash
npm install node-red-contrib-interactive-inject
```

Or via the Node-RED palette manager: search for **interactive-inject**.

## Usage

1. Drag the **interactive inject** node from the **common** category onto the canvas.
2. Drag the slider thumb to your desired value, or click the number display and type a value directly.
3. The value is injected automatically when you release the thumb or press **Enter** (if *Inject on release* is enabled, which is the default).
4. Click the button on the left side of the node to inject manually at any time.

### Output

| Property | Type | Description |
|---|---|---|
| `msg.payload` | `number` | The current slider value |
| `msg.topic` | `string` | The topic configured in the edit panel (empty string if not set) |

## Configuration

| Property | Default | Description |
|---|---|---|
| Topic | _(empty)_ | Sets `msg.topic` on every injected message |
| Min | `0` | Minimum slider value |
| Max | `100` | Maximum slider value |
| Step | `1` | Increment between positions (decimals supported, e.g. `0.1`) |
| Default | `50` | Value on first load |
| Inject on release | `true` | Send automatically when the thumb is released |

## Wrapping the value in a JSON object

To output `{ "/Temperature": 25 }` instead of a plain number, add a **Change** node after this one:

- Action: **Set**
- Target: `msg.payload`
- Type: **J: expression**
- Value: `{"/Temperature": payload}`

The JSONata expression reads the incoming numeric `msg.payload` and builds the object. A ready-made example of this pattern is included — see **Import → Examples → node-red-contrib-interactive-inject → basic-usage** in the Node-RED editor.

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript and copy HTML to dist/
npm run build

# Watch mode
npm run watch

# Run tests
npm test
```

The runtime node is in `src/interactive-inject.ts`; the editor template and canvas rendering are in `src/interactive-inject.html`.

## License

MIT © Dirk-Jan Faber
