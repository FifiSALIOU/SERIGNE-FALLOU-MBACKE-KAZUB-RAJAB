"""
Script pour lister tous les techniciens
"""
from app.database import SessionLocal
from app import models

def list_technicians():
    db = SessionLocal()
    try:
        # Récupérer le rôle Technicien
        tech_role = db.query(models.Role).filter(models.Role.name == "Technicien").first()
        
        if not tech_role:
            print("Aucun rôle 'Technicien' trouvé dans la base de données.")
            return
        
        # Récupérer tous les utilisateurs avec le rôle Technicien
        technicians = db.query(models.User).filter(models.User.role_id == tech_role.id).all()
        
        print("\n" + "="*60)
        print("TECHNICIENS DANS LA BASE DE DONNEES")
        print("="*60 + "\n")
        
        if not technicians:
            print("Aucun technicien trouvé.")
        else:
            for i, tech in enumerate(technicians, 1):
                print(f"{i}. Username: {tech.username}")
                print(f"   Nom complet: {tech.full_name}")
                print(f"   Email: {tech.email}")
                print(f"   Agence: {tech.agency or 'N/A'}")
                print(f"   Spécialisation: {tech.specialization or 'N/A'}")
                print(f"   Status: {tech.status}")
                print()
        
        print("="*60)
        print(f"\nTotal: {len(technicians)} technicien(s)")
        
    except Exception as e:
        print(f"ERREUR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_technicians()

