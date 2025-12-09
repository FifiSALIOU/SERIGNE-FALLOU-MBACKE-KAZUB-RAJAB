# Guide de Configuration Email - Explication Détaillée

## Partie Authentification SMTP

### SMTP_USERNAME
**Qu'est-ce que c'est ?**
- C'est l'adresse email que vous utilisez pour vous connecter au serveur SMTP
- C'est l'email qui sera utilisé pour authentifier l'envoi des emails

**Exemples :**
- Si vous utilisez Gmail : `votre-nom@gmail.com`
- Si vous utilisez Outlook : `votre-nom@outlook.com`
- Si vous utilisez un email d'entreprise : `votre-nom@entreprise.com`

**Dans votre fichier .env, remplacez :**
```
SMTP_USERNAME=your-email@gmail.com
```
**Par :**
```
SMTP_USERNAME=votre-adresse-email@gmail.com
```

---

### SMTP_PASSWORD
**Qu'est-ce que c'est ?**
- C'est le mot de passe pour authentifier l'envoi des emails
- **IMPORTANT** : Pour Gmail, vous ne pouvez PAS utiliser votre mot de passe normal
- Vous devez créer un "Mot de passe d'application" spécial

**Comment obtenir un mot de passe d'application pour Gmail :**
1. Allez sur https://myaccount.google.com/
2. Cliquez sur "Sécurité" dans le menu de gauche
3. Activez "Validation en deux étapes" si ce n'est pas déjà fait
4. Ensuite, allez dans "Mots de passe des applications"
5. Cliquez sur "Sélectionner une application" → Choisissez "Autre (nom personnalisé)"
6. Entrez un nom comme "Système Tickets"
7. Cliquez sur "Générer"
8. **Copiez le mot de passe généré** (16 caractères, par exemple : `abcd efgh ijkl mnop`)

**Dans votre fichier .env, remplacez :**
```
SMTP_PASSWORD=your-app-password
```
**Par :**
```
SMTP_PASSWORD=abcdefghijklmnop
```
(Utilisez le mot de passe d'application que vous venez de générer, SANS les espaces)

---

## Partie Expéditeur

### SENDER_EMAIL
**Qu'est-ce que c'est ?**
- C'est l'adresse email qui apparaîtra comme expéditeur dans les emails reçus
- Les destinataires verront cet email comme l'expéditeur

**Exemples :**
- `tickets@entreprise.com`
- `support@entreprise.com`
- `noreply@entreprise.com`

**Note :** Vous pouvez utiliser la même adresse que `SMTP_USERNAME` ou une autre

**Dans votre fichier .env, remplacez :**
```
SENDER_EMAIL=tickets@entreprise.com
```
**Par :**
```
SENDER_EMAIL=votre-email-expediteur@entreprise.com
```

---

### SENDER_NAME
**Qu'est-ce que c'est ?**
- C'est le nom qui apparaîtra comme expéditeur dans les emails reçus
- Les destinataires verront ce nom dans leur boîte de réception

**Exemples :**
- `Système de Gestion des Tickets`
- `Support Technique`
- `Équipe IT`

**Dans votre fichier .env, vous pouvez garder :**
```
SENDER_NAME=Système de Gestion des Tickets
```
**Ou le modifier selon vos préférences :**
```
SENDER_NAME=Support Technique
```

---

## Exemple Complet

Voici un exemple complet avec des valeurs réelles :

```env
# Authentification SMTP
SMTP_USERNAME=jean.dupont@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
# (Note : dans le fichier .env, enlevez les espaces : abcd efgh ijkl mnop)

# Expéditeur
SENDER_EMAIL=tickets@monentreprise.com
SENDER_NAME=Système de Gestion des Tickets
```

---

## Résumé Rapide

1. **SMTP_USERNAME** = Votre adresse email Gmail/Outlook/etc.
2. **SMTP_PASSWORD** = Mot de passe d'application (pour Gmail) ou mot de passe SMTP
3. **SENDER_EMAIL** = L'email que les destinataires verront comme expéditeur
4. **SENDER_NAME** = Le nom que les destinataires verront comme expéditeur

---

## Besoin d'aide ?

Si vous avez des questions sur la configuration, consultez le fichier `EMAIL_CONFIG.md` pour plus de détails.

