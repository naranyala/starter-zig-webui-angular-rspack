# Vega Charts Integration

## Overview

Professional data visualization using **Vega-Lite** declarative grammar of graphics. The charts demo showcases 12 different chart types across 3 categories.

---

## 📊 Chart Gallery

### Basic Charts (4)

| Chart | Icon | Description |
|-------|------|-------------|
| **Bar Chart** | 📊 | Simple vertical bar chart for categorical data |
| **Line Chart** | 📈 | Time series line chart with smooth curves |
| **Scatter Plot** | ⚬ | Scatter plot for correlation analysis |
| **Pie Chart** | 🥧 | Pie chart for proportion visualization |

### Advanced Charts (4)

| Chart | Icon | Description |
|-------|------|-------------|
| **Area Chart** | 📊 | Stacked area chart for cumulative trends |
| **Heat Map** | 🔥 | Heat map for matrix data visualization |
| **Histogram** | 📊 | Histogram for distribution analysis |
| **Box Plot** | 📦 | Box plot for statistical distribution |

### Interactive Charts (4)

| Chart | Icon | Description |
|-------|------|-------------|
| **Interactive Bar** | 🖱️ | Bar chart with hover and selection |
| **Brush Selection** | 🖌️ | Scatter plot with brush selection |
| **Zoom & Pan** | 🔍 | Line chart with zoom and pan |
| **Rich Tooltips** | 💬 | Chart with enhanced tooltips |

---

## Installation

Vega libraries are installed via Bun:

```json
{
  "dependencies": {
    "vega": "^6.2.0",
    "vega-lite": "^6.4.2",
    "vega-embed": "^7.1.0"
  }
}
```

---

## Usage

### Access the Charts Demo

1. Open the application
2. In the left panel, find **"Thirdparty Demos"** section
3. Click **"📊 Vega Charts"**

### Component Structure

```
frontend/src/views/charts/
└── vega-charts-demo.component.ts    # Main charts gallery
```

### Adding New Charts

To add a new chart:

1. Add chart spec to `chartSpecs` array in `vega-charts-demo.component.ts`
2. Define the Vega-Lite specification
3. Set category (basic/advanced/interactive)

```typescript
{
  id: 'my-new-chart',
  title: 'My Chart',
  icon: '📊',
  description: 'Description here',
  category: 'basic',
  spec: {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: [...] },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
  },
}
```

---

## Features

### Category Filtering

Filter charts by category:
- **All Charts** - Show all 12 charts
- **Basic** - Show 4 basic charts
- **Advanced** - Show 4 advanced charts
- **Interactive** - Show 4 interactive charts

### Responsive Design

- Grid layout adapts to screen size
- Charts resize automatically
- Mobile-friendly (single column on small screens)

### Export Options

Each chart includes:
- **Export as PNG** - Download as image
- **Export as SVG** - Download as vector
- **View Source** - See Vega-Lite spec

---

## Vega-Lite Specification

### Basic Structure

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [...] },
  "mark": { "type": "bar" },
  "encoding": {
    "x": { "field": "category", "type": "ordinal" },
    "y": { "field": "value", "type": "quantitative" },
    "color": { "field": "value", "type": "quantitative" }
  }
}
```

### Mark Types

| Mark | Description | Use Case |
|------|-------------|----------|
| `bar` | Rectangular bars | Categorical comparison |
| `line` | Connected points | Time series |
| `point` | Individual points | Scatter plots |
| `arc` | Wedge shapes | Pie charts |
| `area` | Filled area | Cumulative trends |
| `rect` | Rectangles | Heat maps |
| `boxplot` | Box and whisker | Statistical distribution |

### Encoding Channels

| Channel | Purpose |
|---------|---------|
| `x` | Horizontal position |
| `y` | Vertical position |
| `color` | Color/hue |
| `size` | Point/bar size |
| `shape` | Point shape |
| `theta` | Angular position (pie) |
| `tooltip` | Hover information |

---

## Color Schemes

Built-in Vega color schemes:

| Scheme | Type | Colors |
|--------|------|--------|
| `blues` | Sequential | Blue shades |
| `viridis` | Perceptual | Purple-green |
| `category10` | Categorical | 10 distinct colors |
| `set2` | Categorical | 8 muted colors |
| `oranges` | Sequential | Orange shades |

---

## Interactions

### Parameters

Vega-Lite supports interactive parameters:

```typescript
// Hover highlight
params: [{
  name: 'highlight',
  select: { type: 'point', fields: ['category'], on: 'mouseover' },
}]

// Brush selection
params: [{
  name: 'brush',
  select: { type: 'interval', encodings: ['x', 'y'] },
}]

// Zoom and pan
params: [{
  name: 'grid',
  select: 'interval',
  bind: 'scales',
}]
```

### Conditional Encoding

```typescript
encoding: {
  color: {
    condition: { param: 'highlight', field: 'value' },
    value: '#cbd5e1',  // Default color
  },
}
```

---

## Performance

### Bundle Size Impact

| Component | Size (compressed) |
|-----------|-------------------|
| Vega core | ~200 KB |
| Vega-Lite | ~150 KB |
| Vega-Embed | ~50 KB |
| **Total** | **~400 KB** |

### Optimization Tips

1. **Lazy load** charts component
2. **Use SVG renderer** for better quality
3. **Limit data points** for large datasets
4. **Consider pagination** for many charts

---

## Resources

### Documentation

- [Vega-Lite Documentation](https://vega.github.io/vega-lite/)
- [Vega Editor](https://vega.github.io/editor/)
- [Vega Examples](https://vega.github.io/vega-lite/examples/)

### Tutorials

- [Getting Started](https://vega.github.io/vega-lite/usage/getting_started.html)
- [Encoding Guide](https://vega.github.io/vega-lite/docs/encoding.html)
- [Interactions](https://vega.github.io/vega-lite/docs/selection.html)

---

## Troubleshooting

### Chart Not Rendering

1. Check browser console for errors
2. Verify data format matches spec
3. Ensure container has dimensions

### TypeScript Errors

Use proper tooltip format:
```typescript
// ❌ Wrong
tooltip: ['field1', 'field2']

// ✅ Correct
tooltip: [{ field: 'field1' }, { field: 'field2' }]
```

### Performance Issues

1. Reduce data points
2. Use sampling for large datasets
3. Consider server-side aggregation

---

## Build Status

✅ **Build Successful**

Note: Bundle size increased by ~500KB due to Vega libraries. This is expected for full-featured charting.

---

**Last Updated**: 2026-03-31  
**Charts**: 12 total (4 basic, 4 advanced, 4 interactive)  
**Library**: Vega-Lite v6.4.2
