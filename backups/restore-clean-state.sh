#!/bin/bash
# Joantee Clean State Restore Script
# Usage: ./restore-clean-state.sh

echo "🔄 Restoring Joantee database to clean state..."

# Load environment variables
export PGPASSWORD=$DATABASE_PASSWORD

# Execute the backup SQL file
psql $DATABASE_URL -f $1

if [ $? -eq 0 ]; then
    echo "✅ Database restored to clean state successfully!"
    echo "📋 What you have:"
    echo "  ✅ Greater Accra region with 60 cities"
    echo "  ✅ Two delivery zones (30 & 60 cedis)"
    echo "  ✅ App settings configured"
    echo "  ✅ Admin user ready"
    echo "  ✅ Clean database - no test data"
else
    echo "❌ Error restoring database"
    exit 1
fi
