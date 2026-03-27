#!/bin/bash
# Render start script for backend

echo "Starting PG Stay backend in Render..."

# Run any migrations or setup
node checkAndSeedData.js 2>/dev/null || echo "No migration script needed"

# Start the server
npm start
