import csv
import random
from datetime import datetime, timedelta

def generate_students(num_students=1000):
    first_names = ["Léa", "Lucas", "Manon", "Louis", "Chloé", "Emma", "Nathan", "Jules", "Hugo", "Alice", 
                   "Arthur", "Camille", "Paul", "Zoé", "Gabriel", "Sarah", "Clara", "Thomas", "Enzo", "Inès",
                   "Antoine", "Mathilde", "Clément", "Marie", "Maxime", "Louna", "Théo", "Julie", "Rayan", "Louna"]
    last_names = ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", 
                  "Simon", "Michel", "Lefebvre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard",
                  "Bonnet", "Dupont", "Lambert", "Fontaine", "Rousseau", "Vincent", "Muller", "Lefevre", "Faure", "Andre"]
    
    niveaux = ["L1", "L2", "L3", "Master"]
    salles = [f"Salle {i}" for i in range(1, 7)]
    profils_dejeuner = ["Cafétéria", "Extérieur", "Couloir"]
    
    students = []
    
    # Initialize health statuses: 995 Healthy (0), 5 Infected (2)
    health_statuses = [0] * 995 + [2] * 5
    random.shuffle(health_statuses)
    
    for i in range(num_students):
        stu_id = f"ETU_{i+1:03d}"
        full_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        niveau = random.choice(niveaux)
        classe = random.choice(salles)
        profil = random.choice(profils_dejeuner)
        
        # Arrival between 07:45 and 09:00
        start_time = datetime.strptime("07:45", "%H:%M")
        arrival_minutes = random.randint(0, 75) # 75 mins between 7:45 and 9:00
        arrival_time = (start_time + timedelta(minutes=arrival_minutes)).strftime("%H:%M")
        
        # Departure between 16:30 and 18:30
        end_start_time = datetime.strptime("16:30", "%H:%M")
        departure_minutes = random.randint(0, 120) # 120 mins between 16:30 and 18:30
        departure_time = (end_start_time + timedelta(minutes=departure_minutes)).strftime("%H:%M")
        
        sociability = round(random.uniform(0.0, 1.0), 2)
        
        health_status = health_statuses[i]
        incubation_time = 0
        if health_status == 1:
            incubation_time = random.randint(60, 360) # Example: 1 to 6 hours in mins
            
        students.append([
            stu_id, full_name, niveau, classe, profil, 
            arrival_time, departure_time, sociability, 
            health_status, incubation_time
        ])
        
    return students

def save_to_csv(filename, data):
    header = [
        "ID", "Nom_Prenom", "Niveau", "Classe_Attitree", "Profil_Dejeuner", 
        "Horaire_Arrivee", "Horaire_Depart", "Indice_Sociabilite", 
        "Statut_Sante", "Temps_Incubation_Restant"
    ]
    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(header)
        writer.writerows(data)

if __name__ == "__main__":
    data = generate_students(1000)
    save_to_csv("students.csv", data)
    print("CSV file 'students.csv' generated successfully with 1000 entries.")
