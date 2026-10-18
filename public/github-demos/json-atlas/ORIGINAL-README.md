# JSON Atlas

**Paste any JSON → Get typed code for TypeScript, Python, and Go.**

A free, privacy-first code generator that runs entirely in your browser. No accounts, no servers, no data collection.

## What it does

1. You paste a JSON payload (an API response, a database document, a config file)
2. JSON Atlas infers the types of every field — distinguishing `int` vs `float`, detecting nullable fields, resolving arrays of objects
3. It generates production-ready typed code in three languages:
   - **TypeScript** — `interface` definitions
   - **Python** — `@dataclass` classes with type hints
   - **Go** — `struct` types with `json:"tag"` annotations

## Why this exists

Every developer has done this: you get a JSON response from an API, and you need to write a typed struct/interface/class to deserialize it. You end up manually reading the JSON and writing types by hand. This tool automates that entirely.

The existing tools (like JSONCrack) put code generation behind a paywall. JSON Atlas does it for free.

## Features

- Smart type inference (int vs float, nullable, nested objects, arrays of objects)
- Format / Minify / Copy / Clear toolbar
- Live JSON validation as you type
- One-click copy of generated code
- Sample data loader for quick demo
- File size and line count stats

## Usage

1. Open `index.html` in any browser
2. Paste your JSON in the left panel
3. Click **Generate Code →**
4. Switch between TypeScript / Python / Go tabs
5. Click **Copy** to grab the code

## License

Public domain. Use however you want.
