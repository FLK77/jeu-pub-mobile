"""Build the V5.6 king's anatomical head and hands from the CC0 hm08 mesh.

Run with Blender 4.x, not the system Python:
  blender -b -t 2 --python scripts/build-king-anatomy.py -- \
      --source /tmp/v56-anatomy/makehuman_data_3dobjs_base.obj

Only anatomical body faces above the neck and one hand are retained. No
MakeHuman program code, helper cages, body, genitals or fitting meshes ship.
The imported data was explicitly released as CC0 in September 2020 by Data
Collection AB, Joel Palmius and Jonas Hauquier; see assets/licenses/.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--output', default=str(ROOT / 'assets/v56-king-anatomy.json'))
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(args.source)
assert hashlib.sha256(source.read_bytes()).hexdigest() == '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c', 'Unexpected anatomical source revision'

vertices, texcoords, body, groups = [], [], [], {}
group = ''
for line in source.read_text().splitlines():
    parts = line.split()
    if not parts:
        continue
    if parts[0] == 'v':
        vertices.append(tuple(map(float, parts[1:4])))
    elif parts[0] == 'vt':
        texcoords.append(tuple(map(float, parts[1:3])))
    elif parts[0] == 'g':
        group = ' '.join(parts[1:])
    elif parts[0] == 'f':
        face = []
        for part in parts[1:]:
            indices = part.split('/')
            face.append((int(indices[0]) - 1, int(indices[1]) - 1 if len(indices) > 1 and indices[1] else 0))
        if group == 'body':
            body.append(face)
        groups.setdefault(group, []).append(face)
vertices = np.asarray(vertices, dtype=np.float64)


def centre(name):
    ids = sorted({i for face in groups[name] for i, _ in face})
    return vertices[ids].mean(axis=0)


def gaussian(value, mean, spread):
    return math.exp(-((value - mean) / spread) ** 2)


def smoothstep(a, b, value):
    t = max(0., min(1., (value - a) / (b - a)))
    return t * t * (3. - 2. * t)


def prepare(name, selected, transform):
    ids = sorted({i for face in selected for i, _ in face})
    remap = {old: i for i, old in enumerate(ids)}
    positions = [transform(vertices[i].copy()) for i in ids]
    faces = [[remap[i] for i, _ in face] for face in selected]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(positions, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='AnatomicalUV')
    for polygon, face in zip(mesh.polygons, selected):
        for loop, (_, texture) in zip(polygon.loop_indices, face):
            uv.data[loop].uv = texcoords[texture] if texture < len(texcoords) else (0, 0)
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new('Anatomical subdivision', 'SUBSURF')
    modifier.subdivision_type = 'CATMULL_CLARK'
    modifier.levels = 1
    modifier.render_levels = 1
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def head_shape(p):
    x, y, z = p
    # Mature masculine jaw and cheek planes, with a substantial brow. Every
    # displacement belongs to the connected anatomical surface, not a sphere
    # placed over the face. Ears, nostrils, lips and lid loops stay anatomical.
    front = smoothstep(.75, 1.30, z)
    x *= 1 + .20 * gaussian(y, 6.60, .38)
    # The mandibular corners gain mass without inflating the cheeks or moving
    # the eye/nose/lip attachment points used by the crown and beard.
    x += math.copysign(.055, x) * gaussian(abs(x), .54, .21) * gaussian(y, 6.53, .23) * front
    z += front * (.225 * gaussian(abs(x), .32, .25) * gaussian(y, 7.47, .13)
                  + .070 * gaussian(x, 0, .17) * gaussian(y, 7.47, .17)
                  + .065 * gaussian(abs(x), .51, .22) * gaussian(y, 7.00, .23)
                  + .035 * gaussian(x, 0, .22) * gaussian(y, 6.36, .19))
    z -= front * .065 * gaussian(abs(x), .50, .20) * gaussian(y, 6.78, .16)
    eye = gaussian(abs(x), .31, .16) * gaussian(y, 7.285, .13) * front
    y = y + eye * (7.285 - y) * .20
    z -= .025 * eye
    # Skin below the eyes gains the shallow natural pouch of an older face.
    z += .040 * gaussian(abs(x), .34, .20) * gaussian(y, 7.13, .08) * front
    z -= .025 * gaussian(abs(x), .34, .21) * gaussian(y, 7.045, .045) * front
    return (x, y, z)


def finish_head(obj):
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        front = smoothstep(1.05, 1.35, z)
        crease = 0.
        for row, amount in [(7.65, .039), (7.79, .033), (7.92, .022)]:
            line = row + .07 * (x / .65) ** 2
            crease -= amount * gaussian(y, line, .032) * math.exp(-(abs(x) / .61) ** 6)
        crease -= .055 * gaussian(abs(x), .105, .029) * gaussian(y, 7.50, .15)
        # Nasolabial fold and crow's feet are shallow grooves, not dark wires.
        fold_x = .17 + .34 * max(0., 6.97 - y)
        crease -= .055 * gaussian(abs(x), fold_x, .033) * gaussian(y, 6.79, .25)
        for sign in [-1, 1]:
            crease -= .026 * gaussian(y, 7.28 + sign * (abs(x) - .48) * .35, .023) * gaussian(abs(x), .54, .13)
        vertex.co.z += front * crease
        # Real human proportions, centered for a head parented at y=2.23.
        vertex.co.x *= .20
        vertex.co.y = (vertex.co.y - 7.20) * .165
        vertex.co.z = (vertex.co.z - .65) * .18
    obj.data.update()


def head_color(p):
    x, y, z = p
    red = .07 * gaussian(abs(x), .13, .08) * gaussian(y, -.04, .08)
    eye = .10 * gaussian(abs(x), .062, .033) * gaussian(y, -.008, .025)
    lip = gaussian(y, -.093, .012) * gaussian(x, 0, .047) * smoothstep(.13, .16, z)
    return (1 - .08 * lip, 1 - red - eye - .24 * lip, 1 - red - eye - .26 * lip)


def export_mesh(obj, color):
    mesh = obj.data
    mesh.calc_loop_triangles()
    uv = mesh.uv_layers.active.data
    positions, normals, uvs, colors, indices, mapping = [], [], [], [], [], {}
    for triangle in mesh.loop_triangles:
        for loop_index in triangle.loops:
            loop = mesh.loops[loop_index]
            vertex = mesh.vertices[loop.vertex_index]
            tex = uv[loop_index].uv
            key = (loop.vertex_index, round(tex.x, 6), round(tex.y, 6))
            if key not in mapping:
                mapping[key] = len(positions) // 3
                positions.extend(round(float(v), 6) for v in vertex.co)
                normals.extend(round(float(v), 6) for v in vertex.normal)
                uvs.extend(round(float(v), 6) for v in tex)
                colors.extend(round(float(v), 5) for v in color(vertex.co))
            indices.append(mapping[key])
    return {'positions': positions, 'normals': normals, 'uv': uvs, 'colors': colors, 'indices': indices,
            'triangles': len(indices) // 3}


head_faces = [f for f in body if all(vertices[i, 1] >= 5.80 for i, _ in f)]
head = prepare('Aldren anatomical head', head_faces, head_shape)
finish_head(head)

# The source hand has actual phalanges, knuckles, nails and an opposed thumb.
# Retain its connected skin and pose it around a grip using the source's joint
# locations. Joint helper geometry itself is never copied into the output.
wrist = centre('joint-l-hand')
middle = centre('joint-l-finger-3-1')
down = middle - wrist
down /= np.linalg.norm(down)
lateral = centre('joint-l-finger-5-1') - centre('joint-l-finger-2-1')
lateral -= down * np.dot(lateral, down)
lateral /= np.linalg.norm(lateral)
up = -down
forward = np.cross(lateral, up)
forward /= np.linalg.norm(forward)
basis = np.stack([lateral, up, forward])
scale = .125


def hand_local(p):
    return basis @ (p - wrist) * scale


def rotation(axis, angle):
    axis = axis / np.linalg.norm(axis)
    x, y, z = axis
    c, s, d = math.cos(angle), math.sin(angle), 1-math.cos(angle)
    return np.array([[c+x*x*d, x*y*d-z*s, x*z*d+y*s],
                     [y*x*d+z*s, c+y*y*d, y*z*d-x*s],
                     [z*x*d-y*s, z*y*d+x*s, c+z*z*d]])


finger_guides = {}
for finger in range(1, 6):
    finger_guides[finger] = [hand_local(centre(f'joint-l-finger-{finger}-{joint}')) for joint in range(1, 5)]


def grip_hand(p):
    local = hand_local(p)
    best = None
    for finger, joints in finger_guides.items():
        for segment in range(3):
            a, b = joints[segment:segment+2]
            t = max(0., min(1., float(np.dot(local-a, b-a) / np.dot(b-a, b-a))))
            distance = np.linalg.norm(local - (a + t*(b-a)))
            if best is None or distance < best[0]:
                best = (distance, finger, segment, t)
    distance, finger, segment, t = best
    joints = finger_guides[finger]
    if distance > (.032 if finger == 1 else .027):
        return local
    # Skin near the palm stays fixed. Flexion rises smoothly past each knuckle.
    root_distance = np.dot(local-joints[0], joints[1]-joints[0]) / np.linalg.norm(joints[1]-joints[0])
    influence = smoothstep(-.012, .018, root_distance)
    axis = np.array([1., 0., 0.])
    angles = [-.85, -.72, -.80] if finger != 1 else [-.28, -.45, -.55]
    cumulative = np.eye(3) if finger != 1 else rotation(np.array([0., 0., 1.]), .50)
    posed = joints[0].copy()
    target = None
    for index in range(segment+1):
        if index:
            posed += cumulative @ (joints[index]-joints[index-1])
        cumulative = rotation(axis, angles[index]) @ cumulative
        if index == segment:
            target = posed + cumulative @ (local-joints[index])
    # The smooth, connected mesh is subdivided only after posing.
    return local + (target-local) * influence


hand_faces = []
for face in body:
    p = vertices[[i for i, _ in face]]
    if min(p[:, 0]) > 3.55 and max(p[:, 1]) < 2.80 and min(p[:, 2]) > 1.25:
        if min((p-wrist) @ down) > -.10:
            hand_faces.append(face)
relaxed = prepare('Anatomical relaxed hand', hand_faces, hand_local)
grip = prepare('Anatomical hand with natural grip', hand_faces, grip_hand)


def hand_color(p):
    return (1., .97, .95)


result = {
    'source': {'name': 'MakeHuman hm08 anatomical base, mature king derivative', 'license': 'CC0-1.0',
               'url': 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj',
               'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
               'copyright': '2020 Data Collection AB, Joel Palmius, Jonas Hauquier'},
    'head': export_mesh(head, head_color),
    'handGrip': export_mesh(grip, hand_color),
    'handRelaxed': export_mesh(relaxed, hand_color),
    'features': {'eyes': [[-.0616, .014, .114], [.0616, .014, .114]],
                 'headBounds': {'width': .352, 'height': .444, 'depth': .373},
                 'noseFront': .185, 'lips': [0, -.093, .167], 'chin': [0, -.165, .153]}
}
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
for name in ['head', 'handGrip', 'handRelaxed']:
    print(name, result[name]['triangles'], 'triangles', len(result[name]['positions'])//3, 'vertices')
print('Written', output, output.stat().st_size, 'bytes')
