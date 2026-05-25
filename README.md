# node-red-contrib-interactive-inject

A Node-RED node that renders an interactive widget **directly on the editor canvas** — no dashboard required. Choose between a **numeric slider** or a set of **preset buttons**; either way, clicking or dragging injects a value straight into your flow.

<img src="https://raw.githubusercontent.com/dirkjanfaber/node-red-contrib-interactive-inject/main/docs/screenshot.png" alt="interactive-inject node on the Node-RED canvas" width="500">

## Features

- Two modes selectable per node: **Slider** and **Preset buttons**
- **Slider mode** — inline `<input type="range">` embedded in the node body; drag the thumb or click the number and type directly; press **Enter** to commit or **Escape** to cancel
- **Preset buttons mode** — configurable buttons rendered on the canvas; each button has a label and an arbitrary typed value (string, number, boolean, JSON, JSONata, …); hovering a button previews its value before you click
- **Configurable output property** — write the injected value to any message property (default: `msg.payload`), including nested paths such as `msg.data.value`
- **Full message output** (preset buttons) — optionally send the evaluated result as the entire `msg` object instead of a single property
- **Node status indicator** — last injected value shown below the node after each injection
- **Auto-label presets** — if a preset label is left blank, the value string is used as the label automatically
- **Inject on release** (slider mode) — automatically sends the value when the thumb is released (can be disabled)
- **Auto-collapse** — optional: widget collapses to normal node height after 3 s of inactivity, expands on hover
- Left-side inject button for manual triggering, like the built-in Inject node
- Last value/selection persisted to `flows.json` — survives deploy and restart
- Configurable label and topic for both modes
- Works with Node-RED 3.x and above; no dependency on node-red-dashboard

## Installation

Install from your Node-RED user directory (typically `~/.node-red`):

```bash
npm install node-red-contrib-interactive-inject
```

Or via the Node-RED palette manager: search for **interactive-inject**.

## Usage

1. Drag the **interactive inject** node from the **common** category onto the canvas.
2. Open the edit panel and choose a **Mode**: *Slider* or *Preset buttons*.

**Slider mode**

- Drag the slider thumb to your desired value, or click the number display and type a value directly.
- The value is injected automatically when you release the thumb or press **Enter** (if *Inject on release* is enabled, which is the default).
- Click the button on the left side of the node to inject the current value manually at any time.

**Preset buttons mode**

- Add one or more presets in the edit panel — give each a **label** and a **value** (any supported type). If you leave the label blank it defaults to the value string.
- The buttons appear directly on the canvas; hover a button to preview its value, click to inject.
- The last clicked preset is highlighted and re-injected when the left-side button is pressed.
- Tick **full msg** on a preset to send the evaluated result as the entire message object (useful with JSON/JSONata presets that define the full message structure).

### Output

| Property | Type | Description |
|---|---|---|
| _(configured property)_ | any | The injected value, written to the property set in the **Property** field (default: `msg.payload`) |
| `msg.topic` | `string` | The topic configured in the edit panel (empty string if not set) |
| `msg.label` | `string` | _(Preset buttons mode only)_ The label of the clicked button |

## Configuration

### Common

| Property | Default | Description |
|---|---|---|
| Topic | _(empty)_ | Sets `msg.topic` on every injected message |
| Property | `payload` | The message property to write the injected value to (any path, e.g. `data.value`) |
| Mode | `Slider` | Choose between *Slider* and *Preset buttons* |

### Slider mode

| Property | Default | Description |
|---|---|---|
| Min | `0` | Minimum slider value |
| Max | `100` | Maximum slider value |
| Step | `1` | Increment between positions (decimals supported, e.g. `0.1`) |
| Default | `50` | Value on first load |
| Inject on release | `true` | Send automatically when the thumb is released |

### Preset buttons mode

| Property | Description |
|---|---|
| Presets | Ordered list of buttons. Each entry has a **Label** (shown on the button; auto-filled from the value if left blank), a **Value** with a type selector (string, number, boolean, JSON, JSONata, …), and an optional **full msg** toggle |

### Widget behaviour

| Property | Default | Description |
|---|---|---|
| Auto-collapse | `false` | When enabled, the widget collapses to normal node height 3 s after the cursor leaves the node, and re-expands immediately on hover |

## Using the label in a JSONata preset value

When the value type is set to **J: expression** (JSONata), the button's label is available as the variable `label`. This lets you encode a parameter directly in the button name and reference it in the expression without duplication.

Example — button label `2000`, value type JSONata:

```jsonata
{ "offset": $number(label) }
```

Produces `msg.payload = { "offset": 2000 }` and `msg.label = "2000"`.

A more complete example — label `now +2m: 5k`, value type JSONata:

```jsonata
{
  "lowerLimit": -5000,
  "upperLimit": 5000,
  "duration": 900000,
  "executionTime": $millis() + 2 * 60 * 1000
}
```

Here the execution time is computed at the moment the button is pressed, so it always reflects the actual current time plus the offset.

## Wrapping the value in a JSON object

To output `{ "/Temperature": 25 }` instead of a plain number, add a **Change** node after this one:

- Action: **Set**
- Target: `msg.payload`
- Type: **J: expression**
- Value: `{"/Temperature": payload}`

The JSONata expression reads the incoming numeric `msg.payload` and builds the object. A ready-made example of this pattern is included — see **Import → Examples → node-red-contrib-interactive-inject → basic-usage** in the Node-RED editor.

Additional examples are available under the same import path:

| Example | Description |
|---|---|
| `basic-usage` | Slider with a Change node that wraps the value in a JSON key |
| `preset-buttons` | Preset buttons mode with string, number, boolean, and JSON value types |
| `preset-jsonata-label` | Preset buttons with JSONata expressions that reference the button label via `label` |

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
