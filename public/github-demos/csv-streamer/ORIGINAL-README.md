# StreamCSV

A highly scalable, entirely client-side CSV to JSON parser built for massive datasets.

## The Problem
Developers frequently need to convert large CSV files (e.g. 500MB+) to JSON, but doing this via standard browser APIs (`FileReader.readAsText`) or online formatter tools crashes the tab by exhausting memory.

## The Solution
StreamCSV leverages the modern HTML5 `File.stream()` API to process files in tiny chunks. It yields processing back to the UI thread constantly and builds the final JSON file as an array of memory-efficient Blobs. This allows you to instantly parse gigabyte-sized files locally in seconds, without any server uploads, latency, or memory crashes.

## Usage
Simply open `index.html` in your browser and drag/drop any large CSV file. Watch it stream the conversion, then click download!
