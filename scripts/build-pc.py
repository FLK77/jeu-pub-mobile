"""Build a Windows launcher and a self-contained, offline HTML game (stdlib only)."""
from pathlib import Path
import re
from zipfile import ZipFile, ZIP_DEFLATED
import json
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'pc'
OUTPUT.mkdir(exist_ok=True)
VERSION=json.loads((ROOT / 'package.json').read_text())['version']

html = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'style.css').read_text(encoding='utf-8')
js = (ROOT / 'game.bundle.js').read_text(encoding='utf-8')
# The downloadable edition must never need a network request, including for fonts.
css = '\n'.join(line for line in css.splitlines() if not line.lstrip().startswith('@import'))
html = html.replace('<link rel="stylesheet" href="./style.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="./game.bundle.js"></script>', '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>')
html = html.replace('href="./"', 'href="./jeu-pc.html"')
if re.search(r'<(?:script|link)\b[^>]*(?:src|href)=', html):
    raise RuntimeError('An external script or stylesheet remains in the offline edition')
(OUTPUT / 'jeu-pc.html').write_text(html, encoding='utf-8')
(OUTPUT / 'LANCER-JEU.bat').write_bytes(
    b'@echo off\r\n'
    b'if not exist "%~dp0jeu-pc.html" (\r\n'
    b'  echo Extrayez tout le ZIP avant de lancer le jeu.\r\n'
    b'  pause\r\n'
    b'  exit /b 1\r\n'
    b')\r\n'
    b'start "" "%~dp0jeu-pc.html"\r\n'
)
(OUTPUT / 'LIRE-MOI.txt').write_text(
    f'LE DERNIER ROYAUME - V{VERSION} - PC 3D\n\n'
    '1. Extraire tout le fichier Royaume-PC.zip.\n'
    '2. Ouvrir le dossier Royaume-PC.\n'
    '3. Double-cliquer sur LANCER-JEU.bat.\n\n'
    'Autre possibilite : double-cliquer directement sur jeu-pc.html.\n'
    'Utiliser Edge, Chrome ou Firefox recent avec WebGL 2. Aucune installation requise.\n'
    'La version PC fonctionne hors ligne, sans serveur ni GitHub Pages.\n\n'
    'COMMANDES\n'
    'ZQSD, WASD ou fleches : deplacer le roi.\n'
    'Tirs automatiques. Approcher les pieces pour les ramasser.\n'
    'Menu Royaume : reconstruire, engager des archers et ameliorer l arc.\n'
    'M, Echap ou Espace : menu et pause.\n'
    'E : monter, descendre, secourir ou fouiller les vestiges.\n'
    'Son facultatif avec le bouton SON.\n\n'
    'Prototype : la partie n est pas sauvegardee a la fermeture.\n',
    encoding='utf-8',
)
(OUTPUT / 'VERSION.txt').write_text(f'Le Dernier Royaume - V{VERSION}\n',encoding='utf-8')
(OUTPUT / 'THIRD-PARTY-NOTICES.txt').write_bytes((ROOT / 'THIRD-PARTY-NOTICES.txt').read_bytes())
with ZipFile(ROOT / 'Royaume-PC.zip', 'w', compression=ZIP_DEFLATED) as archive:
    for name in ['LANCER-JEU.bat', 'jeu-pc.html', 'LIRE-MOI.txt', 'THIRD-PARTY-NOTICES.txt', 'VERSION.txt']:
        archive.write(OUTPUT / name, 'Royaume-PC/' + name)
shutil.copyfile(ROOT / 'Royaume-PC.zip', ROOT / f"Royaume-PC-V{VERSION.split('.')[0]}.zip")
print(f"Built Royaume-PC-V{VERSION.split('.')[0]}.zip and Royaume-PC.zip: extract all, then double-click LANCER-JEU.bat")
