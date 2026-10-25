"""Build the self-contained Courvane PC edition using the Python standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import re
import shutil

ROOT=Path(__file__).resolve().parent.parent
OUTPUT=ROOT/'pc'
OUTPUT.mkdir(exist_ok=True)
VERSION=json.loads((ROOT/'package.json').read_text())['version']
NAME='Courvane'
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'style.css').read_text(encoding='utf-8')
js=(ROOT/'game.bundle.js').read_text(encoding='utf-8')
css='\n'.join(line for line in css.splitlines() if not line.lstrip().startswith('@import'))
html=html.replace('<link rel="stylesheet" href="./style.css">','<style>\n'+css+'\n</style>')
html=html.replace('<script src="./game.bundle.js"></script>','<script>\n'+js.replace('</script','<\\/script')+'\n</script>')
if re.search(r'<(?:script|link)\b[^>]*(?:src|href)=',html):
    raise RuntimeError('External script or stylesheet remains in the PC edition')
(OUTPUT/'jeu-pc.html').write_text(html,encoding='utf-8')
(OUTPUT/'LANCER-JEU.bat').write_bytes(
    b'@echo off\r\n'
    b'if not exist "%~dp0jeu-pc.html" (\r\n'
    b'  echo Extrayez tout le ZIP avant de lancer le jeu.\r\n'
    b'  pause\r\n'
    b'  exit /b 1\r\n'
    b')\r\n'
    b'start "" "%~dp0jeu-pc.html"\r\n'
)
(OUTPUT/'LIRE-MOI.txt').write_text(
    f'COURVANE - V{VERSION} - PC 3D\n\n'
    '1. Extraire tout le ZIP Courvane-PC-V6.zip.\n'
    '2. Ouvrir le dossier Courvane-PC.\n'
    '3. Double-cliquer sur LANCER-JEU.bat.\n\n'
    'Vous pouvez aussi ouvrir directement jeu-pc.html avec Edge, Chrome ou Firefox recent.\n'
    'WebGL 2 et acceleration graphique necessaires. Aucun serveur ni connexion requis.\n\n'
    'AU LANCEMENT\n'
    'Personnalisez le nom, le teint, la barbe, les cheveux, la cape et la couronne.\n'
    'Les nouveaux habitants attendent votre choix de metier dans Habitants.\n'
    'Les constructeurs realisent les plans places sur le terrain.\n'
    'Seules les maisons achevees augmentent la capacite.\n\n'
    'COMMANDES\n'
    'ZQSD / WASD / fleches : deplacement.\n'
    'E : monter, descendre, secourir ou fouiller.\n'
    '1 : arc automatique. 2 : hache. F : couper ou frapper.\n'
    'M / Echap / Espace : menu et pause.\n'
    'B : catalogue de construction. R : tourner le plan. Entree : placer. Echap : annuler.\n'
    'Sur mobile : joystick, boutons d armes, interaction et confirmation de placement.\n\n'
    'Les salaires deviennent necessaires au niveau 3 du royaume ou a 10 habitants.\n'
    'La partie n est pas encore sauvegardee a la fermeture.\n',encoding='utf-8')
(OUTPUT/'VERSION.txt').write_text(f'{NAME} - V{VERSION}\n',encoding='utf-8')
(OUTPUT/'THIRD-PARTY-NOTICES.txt').write_bytes((ROOT/'THIRD-PARTY-NOTICES.txt').read_bytes())
archive_path=ROOT/f'Courvane-PC-V{VERSION.split(".")[0]}.zip'
with ZipFile(archive_path,'w',compression=ZIP_DEFLATED) as archive:
    for name in ['LANCER-JEU.bat','jeu-pc.html','LIRE-MOI.txt','THIRD-PARTY-NOTICES.txt','VERSION.txt']:
        archive.write(OUTPUT/name,'Courvane-PC/'+name)
for alias in ['Courvane-PC.zip','Royaume-PC.zip']:
    shutil.copyfile(archive_path,ROOT/alias)
print(f'Built {archive_path.name}; extract all and run LANCER-JEU.bat')
