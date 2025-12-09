"""
Script pour mettre à jour les spécialisations des techniciens
"""
from app.database import SessionLocal
from app import models

def update_technician_specializations():
    db = SessionLocal()
    try:
        # Récupérer le rôle Technicien
        tech_role = db.query(models.Role).filter(models.Role.name == "Technicien").first()
        
        if not tech_role:
            print("Aucun rôle 'Technicien' trouvé dans la base de données.")
            return
        
        # Récupérer tous les techniciens
        technicians = db.query(models.User).filter(models.User.role_id == tech_role.id).all()
        
        if not technicians:
            print("Aucun technicien trouvé.")
            return
        
        print("\n" + "="*60)
        print("MISE A JOUR DES SPECIALISATIONS DES TECHNICIENS")
        print("="*60 + "\n")
        
        # Mettre à jour tech1 comme technicien matériel
        tech1 = db.query(models.User).filter(models.User.username == "tech1").first()
        if tech1:
            tech1.specialization = "materiel"
            print(f"OK - {tech1.username} ({tech1.full_name}) -> Spécialisation: materiel")
        
        # Mettre à jour tech2 comme technicien applicatif
        tech2 = db.query(models.User).filter(models.User.username == "tech2").first()
        if tech2:
            tech2.specialization = "applicatif"
            print(f"OK - {tech2.username} ({tech2.full_name}) -> Spécialisation: applicatif")
        
        # Pour les autres techniciens sans spécialisation, on peut les laisser ou leur en assigner une
        for tech in technicians:
            if tech.username not in ["tech1", "tech2"] and not tech.specialization:
                print(f"ATTENTION - {tech.username} ({tech.full_name}) -> Aucune spécialisation assignée")
        
        db.commit()
        print("\n" + "="*60)
        print("Mise à jour terminée avec succès !")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"ERREUR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_technician_specializations()

