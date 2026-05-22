"""Convert students.csv to a JS data module."""
import csv, json

students = []
with open('students.csv', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        # Parse arrival/departure as minutes from midnight
        def to_min(t):
            h, m = map(int, t.split(':'))
            return h * 60 + m
        students.append({
            'id': row['ID'],
            'name': row['Nom_Prenom'],
            'niveau': row['Niveau'],
            'classe': row['Classe_Attitree'],       # "Salle 1" … "Salle 6"
            'profil': row['Profil_Dejeuner'],        # Cafétéria / Extérieur / Couloir
            'arrivalMin': to_min(row['Horaire_Arrivee']) - 7*60,  # minutes from 7:00
            'departureMin': to_min(row['Horaire_Depart']) - 7*60,
            'sociability': float(row['Indice_Sociabilite']),
            'status': int(row['Statut_Sante']),          # 0 sain, 1 incubation, 2 infecté
            'incubation': int(row['Temps_Incubation_Restant']),
        })

with open('js/students_data.js', 'w', encoding='utf-8') as f:
    f.write('/* AUTO-GENERATED from students.csv — do not edit manually */\n')
    f.write(f'const STUDENTS_DATA = {json.dumps(students, ensure_ascii=False)};\n')

print(f'OK: {len(students)} students → js/students_data.js')
