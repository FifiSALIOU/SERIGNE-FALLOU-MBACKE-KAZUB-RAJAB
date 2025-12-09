"""
Service d'envoi d'emails pour les notifications de tickets
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    """Service pour envoyer des emails via SMTP"""
    
    def __init__(self):
        # Récupérer les paramètres depuis les variables d'environnement
        # avec des valeurs par défaut
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.sender_email = os.getenv("SENDER_EMAIL", "tickets@entreprise.com")
        self.sender_name = os.getenv("SENDER_NAME", "Système de Gestion des Tickets")
        self.use_tls = os.getenv("USE_TLS", "true").lower() == "true"
        self.verify_ssl = os.getenv("VERIFY_SSL", "true").lower() == "true"
        self.email_enabled = os.getenv("EMAIL_ENABLED", "true").lower() == "true"
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ) -> bool:
        """
        Envoie un email à une ou plusieurs adresses
        
        Args:
            to_emails: Liste des adresses email destinataires
            subject: Sujet de l'email
            body: Corps de l'email en texte brut
            html_body: Corps de l'email en HTML (optionnel)
        
        Returns:
            True si l'email a été envoyé avec succès, False sinon
        """
        if not self.email_enabled:
            print(f"[EMAIL] Envoi désactivé - Email non envoyé à {to_emails}")
            return False
        
        if not to_emails:
            print("[EMAIL] Aucun destinataire spécifié")
            return False
        
        # Filtrer les emails vides
        to_emails = [email for email in to_emails if email and email.strip()]
        if not to_emails:
            print("[EMAIL] Aucun email valide dans la liste")
            return False
        
        try:
            # Créer le message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.sender_name} <{self.sender_email}>"
            msg['To'] = ", ".join(to_emails)
            msg['Subject'] = subject
            
            # Ajouter le corps en texte brut
            text_part = MIMEText(body, 'plain', 'utf-8')
            msg.attach(text_part)
            
            # Ajouter le corps HTML si fourni
            if html_body:
                html_part = MIMEText(html_body, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Connexion au serveur SMTP
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            
            # Authentification si nécessaire
            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)
            
            # Envoyer l'email
            server.send_message(msg)
            server.quit()
            
            print(f"[EMAIL] Email envoyé avec succès à {to_emails}")
            return True
            
        except Exception as e:
            print(f"[EMAIL] Erreur lors de l'envoi de l'email: {str(e)}")
            return False
    
    def send_ticket_created_notification(
        self,
        ticket_number: int,
        ticket_title: str,
        creator_name: str,
        recipient_emails: List[str]
    ) -> bool:
        """
        Envoie une notification lorsqu'un nouveau ticket est créé
        
        Args:
            ticket_number: Numéro du ticket
            ticket_title: Titre du ticket
            creator_name: Nom du créateur du ticket
            recipient_emails: Liste des emails destinataires (DSI, Secrétaire, Adjoint)
        
        Returns:
            True si l'email a été envoyé avec succès
        """
        subject = f"Nouveau ticket #{ticket_number} créé: {ticket_title}"
        
        body = f"""
Bonjour,

Un nouveau ticket a été créé dans le système de gestion des tickets.

Détails du ticket :
• Numéro : #{ticket_number}
• Titre : {ticket_title}
• Créateur : {creator_name}

Veuillez vous connecter à l'application pour analyser et assigner ce ticket.

Cordialement,
{self.sender_name}
"""
        
        html_body = f"""
<html>
<body>
    <h2>Nouveau ticket créé</h2>
    <p>Bonjour,</p>
    <p>Un nouveau ticket a été créé dans le système de gestion des tickets.</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Détails du ticket :</strong></p>
        <ul>
            <li><strong>Numéro :</strong> #{ticket_number}</li>
            <li><strong>Titre :</strong> {ticket_title}</li>
            <li><strong>Créateur :</strong> {creator_name}</li>
        </ul>
    </div>
    <p>Veuillez vous connecter à l'application pour analyser et assigner ce ticket.</p>
    <p>Cordialement,<br>{self.sender_name}</p>
</body>
</html>
"""
        
        return self.send_email(recipient_emails, subject, body, html_body)
    
    def send_ticket_assigned_notification(
        self,
        ticket_number: int,
        ticket_title: str,
        technician_email: str,
        technician_name: str,
        priority: Optional[str] = None,
        notes: Optional[str] = None
    ) -> bool:
        """
        Envoie une notification lorsqu'un ticket est assigné à un technicien
        
        Args:
            ticket_number: Numéro du ticket
            ticket_title: Titre du ticket
            technician_email: Email du technicien
            technician_name: Nom du technicien
            priority: Priorité du ticket (optionnel)
            notes: Notes d'assignation (optionnel)
        
        Returns:
            True si l'email a été envoyé avec succès
        """
        subject = f"Ticket #{ticket_number} vous a été assigné: {ticket_title}"
        
        body = f"""
Bonjour {technician_name},

Un nouveau ticket vous a été assigné.

Détails du ticket :
• Numéro : #{ticket_number}
• Titre : {ticket_title}
"""
        
        if priority:
            body += f"• Priorité : {priority}\n"
        
        if notes:
            body += f"\nInstructions :\n{notes}\n"
        
        body += f"""
Veuillez vous connecter à l'application pour prendre en charge ce ticket.

Cordialement,
{self.sender_name}
"""
        
        html_body = f"""
<html>
<body>
    <h2>Ticket assigné</h2>
    <p>Bonjour {technician_name},</p>
    <p>Un nouveau ticket vous a été assigné.</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Détails du ticket :</strong></p>
        <ul>
            <li><strong>Numéro :</strong> #{ticket_number}</li>
            <li><strong>Titre :</strong> {ticket_title}</li>
"""
        
        if priority:
            html_body += f"            <li><strong>Priorité :</strong> {priority}</li>\n"
        
        html_body += "        </ul>"
        
        if notes:
            html_body += f"""
        <p><strong>Instructions :</strong></p>
        <p style="background-color: #fff; padding: 10px; border-left: 3px solid #007bff;">{notes}</p>
"""
        
        html_body += """
    </div>
    <p>Veuillez vous connecter à l'application pour prendre en charge ce ticket.</p>
    <p>Cordialement,<br>{}</p>
</body>
</html>
""".format(self.sender_name)
        
        return self.send_email([technician_email], subject, body, html_body)


# Instance globale du service email
email_service = EmailService()

