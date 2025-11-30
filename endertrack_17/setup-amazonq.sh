#!/bin/bash
# Setup Amazon Q context for EnderTrack

echo "🚀 Configuration Amazon Q pour EnderTrack..."

# Créer le dossier prompts
mkdir -p ~/.aws/amazonq/prompts

# Copier le prompt
cp .amazonq/endertrack-prompt.md ~/.aws/amazonq/prompts/endertrack-context.md

echo "✅ Configuration terminée !"
echo "Utilisez: @endertrack-context dans vos conversations"