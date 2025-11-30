#!/bin/bash
# Script pour connecter à GitHub
# Remplacez VOTRE-USERNAME par votre nom d'utilisateur GitHub

echo "🔗 Connexion à GitHub..."

# Remplacez par votre URL GitHub
echo "Collez votre URL GitHub ici :"
read -p "URL: " GITHUB_URL

echo "⚠️  Modifiez ce script avec votre URL GitHub avant de l'exécuter !"
echo "URL actuelle : $GITHUB_URL"

read -p "Voulez-vous continuer ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git remote add origin $GITHUB_URL
    git branch -M main
    git push -u origin main
    echo "✅ Projet envoyé sur GitHub !"
else
    echo "❌ Annulé. Modifiez l'URL dans le script."
fi