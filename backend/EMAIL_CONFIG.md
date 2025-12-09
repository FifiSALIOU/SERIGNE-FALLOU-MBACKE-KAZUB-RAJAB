# Configuration Email

Ce document explique comment configurer l'envoi d'emails pour les notifications de tickets.

## Variables d'environnement

Créez un fichier `.env` dans le dossier `backend/` avec les paramètres suivants :

```env
# Activer/désactiver l'envoi d'emails (true/false)
EMAIL_ENABLED=true

# Serveur SMTP
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# Authentification SMTP
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Expéditeur
SENDER_EMAIL=tickets@entreprise.com
SENDER_NAME=Système de Gestion des Tickets

# Options de sécurité
USE_TLS=true
VERIFY_SSL=true
```

## Configuration Gmail

Pour utiliser Gmail comme serveur SMTP :

1. Activez l'authentification à deux facteurs sur votre compte Gmail
2. Générez un mot de passe d'application :
   - Allez dans les paramètres de votre compte Google
   - Sécurité → Authentification à deux facteurs → Mots de passe des applications
   - Générez un nouveau mot de passe d'application
   - Utilisez ce mot de passe dans `SMTP_PASSWORD`

## Configuration Outlook/Office 365

```env
SMTP_SERVER=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
USE_TLS=true
```

## Fonctionnalités

Le système envoie automatiquement des emails dans les cas suivants :

1. **Création d'un ticket** : Email envoyé à tous les DSI, Secrétaires DSI et Adjoints DSI actifs
2. **Assignation d'un ticket** : Email envoyé au technicien assigné
3. **Réassignation d'un ticket** : Email envoyé au nouveau technicien

## Désactiver l'envoi d'emails

Pour désactiver temporairement l'envoi d'emails sans modifier le code, définissez :

```env
EMAIL_ENABLED=false
```

Les notifications seront toujours créées dans la base de données, mais aucun email ne sera envoyé.

