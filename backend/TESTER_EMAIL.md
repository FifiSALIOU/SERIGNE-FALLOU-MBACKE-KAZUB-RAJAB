# Comment Tester la Configuration Email

## Étape 1 : Redémarrer le serveur backend

**IMPORTANT** : Vous devez redémarrer le serveur backend pour que les nouvelles variables d'environnement soient chargées.

1. Arrêtez le serveur backend (Ctrl+C dans le terminal où il tourne)
2. Redémarrez-le avec :
   ```powershell
   cd backend
   .\start.ps1
   ```
   Ou :
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

## Étape 2 : Tester avec l'API (Méthode 1 - Recommandée)

### Option A : Utiliser l'endpoint de test dans l'interface DSI

1. Connectez-vous à l'interface DSI
2. Allez dans **Paramètres** → **Email** → **Test**
3. Entrez votre adresse email dans "Adresse Email de Test"
4. Cliquez sur "Envoyer Email de Test"
5. Vérifiez votre boîte de réception (et les spams)

### Option B : Utiliser l'API directement avec curl ou Postman

**Avec curl (PowerShell) :**
```powershell
# D'abord, connectez-vous pour obtenir un token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/token" -Method POST -ContentType "application/x-www-form-urlencoded" -Body @{
    username = "votre-username-dsi"
    password = "votre-password"
}

$token = $loginResponse.access_token

# Ensuite, testez l'email
Invoke-RestMethod -Uri "http://localhost:8000/settings/email/test?test_email=csstickets7@gmail.com" -Method POST -Headers @{
    Authorization = "Bearer $token"
}
```

**Avec Postman :**
1. Créez une requête POST vers : `http://localhost:8000/settings/email/test?test_email=csstickets7@gmail.com`
2. Dans l'onglet "Authorization", sélectionnez "Bearer Token"
3. Entrez votre token JWT (obtenu après connexion)
4. Envoyez la requête

## Étape 3 : Tester en créant un ticket (Méthode 2)

1. Connectez-vous en tant qu'**Utilisateur**
2. Créez un nouveau ticket
3. Les DSI, Secrétaires DSI et Adjoints DSI actifs devraient recevoir un email automatiquement
4. Vérifiez leurs boîtes de réception

## Étape 4 : Tester l'assignation (Méthode 3)

1. Connectez-vous en tant que **DSI** ou **Secrétaire DSI**
2. Assignez un ticket à un technicien
3. Le technicien assigné devrait recevoir un email automatiquement
4. Vérifiez la boîte de réception du technicien

## Vérification des logs

Pendant les tests, regardez les logs du serveur backend. Vous devriez voir :
- `[EMAIL] Email envoyé avec succès à ...` si ça fonctionne
- `[EMAIL] Erreur lors de l'envoi de l'email: ...` s'il y a une erreur

## Problèmes courants

### Erreur : "SMTP Authentication failed"
- Vérifiez que vous utilisez un **mot de passe d'application** et non votre mot de passe normal
- Vérifiez que la validation en deux facteurs est activée sur Gmail

### Erreur : "Connection refused"
- Vérifiez que `SMTP_SERVER` et `SMTP_PORT` sont corrects
- Vérifiez votre connexion internet

### Pas d'email reçu
- Vérifiez les spams
- Vérifiez que `EMAIL_ENABLED=true` dans le .env
- Vérifiez les logs du serveur pour voir les erreurs

## Désactiver temporairement les emails

Si vous voulez désactiver les emails sans modifier le code :
```env
EMAIL_ENABLED=false
```
Puis redémarrez le serveur.

