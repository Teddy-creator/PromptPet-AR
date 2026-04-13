import json
import math
from pathlib import Path

import bpy


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CONTRACT_PATH = PROJECT_ROOT / "assets/fox-base/fox-base-v10.contract.json"
HIDDEN_SCALE = (0.001, 0.001, 0.001)

CONTRACT = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
OBJECTS = CONTRACT["objects"]
ACCESSORY_MATERIAL_NAME = CONTRACT["sourceMaterials"]["accessory"]


def remove_object(name: str):
    obj = bpy.data.objects.get(name)
    if obj is None:
        return

    data = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)

    if data is not None and getattr(data, "users", 0) == 0:
        bpy.data.meshes.remove(data)


def assign_accessory_material(obj: bpy.types.Object):
    material = bpy.data.materials.get(ACCESSORY_MATERIAL_NAME)
    if material is None or obj.type != "MESH":
        return

    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def primitive_cube(name: str, location, scale, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def primitive_uv_sphere(name: str, location, scale, rotation=(0, 0, 0), segments=24, ring_count=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=ring_count,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def primitive_cylinder(name: str, location, radius, depth, rotation=(0, 0, 0), vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    return obj


def primitive_torus(name: str, location, major_radius, minor_radius, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
        major_segments=24,
        minor_segments=12,
    )
    obj = bpy.context.active_object
    obj.name = name
    return obj


def join_objects(name: str, objects: list[bpy.types.Object]):
    bpy.ops.object.select_all(action="DESELECT")

    for obj in objects:
        obj.select_set(True)

    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    joined.data.name = f"{name}_Mesh"
    bpy.ops.object.shade_smooth()
    assign_accessory_material(joined)
    joined.scale = HIDDEN_SCALE
    return joined


def build_tie():
    rotation = (math.radians(12), 0.0, math.radians(-28))
    knot = primitive_cube(
        "FoxBase_AccTie_knot",
        location=(-0.006, 0.098, 0.131),
        scale=(0.008, 0.0035, 0.0045),
        rotation=rotation,
    )
    body = primitive_cube(
        "FoxBase_AccTie_body",
        location=(-0.004, 0.101, 0.112),
        scale=(0.0065, 0.0022, 0.016),
        rotation=rotation,
    )
    tip = primitive_cube(
        "FoxBase_AccTie_tip",
        location=(-0.003, 0.103, 0.092),
        scale=(0.0085, 0.0018, 0.006),
        rotation=(rotation[0], rotation[1], rotation[2] + math.radians(45)),
    )
    join_objects(OBJECTS["accessoryTie"], [knot, body, tip])


def build_badge():
    base = primitive_cylinder(
        "FoxBase_AccBadge_base",
        location=(-0.004, 0.101, 0.122),
        radius=0.012,
        depth=0.004,
        rotation=(math.radians(96), 0.0, math.radians(-12)),
    )
    star = primitive_cube(
        "FoxBase_AccBadge_star",
        location=(-0.004, 0.103, 0.122),
        scale=(0.004, 0.0015, 0.004),
        rotation=(math.radians(40), 0.0, math.radians(45)),
    )
    join_objects(OBJECTS["accessoryBadge"], [base, star])


def build_bow():
    rotation = (math.radians(8), 0.0, math.radians(-18))
    left = primitive_uv_sphere(
        "FoxBase_AccBow_left",
        location=(-0.094, 0.048, 0.292),
        scale=(0.014, 0.006, 0.01),
        rotation=rotation,
    )
    right = primitive_uv_sphere(
        "FoxBase_AccBow_right",
        location=(-0.07, 0.051, 0.286),
        scale=(0.014, 0.006, 0.01),
        rotation=(rotation[0], rotation[1], rotation[2] - math.radians(6)),
    )
    knot = primitive_cube(
        "FoxBase_AccBow_knot",
        location=(-0.082, 0.05, 0.289),
        scale=(0.0048, 0.003, 0.004),
        rotation=rotation,
    )
    join_objects(OBJECTS["accessoryBow"], [left, right, knot])


def build_pendant():
    ring = primitive_torus(
        "FoxBase_AccPendant_ring",
        location=(-0.004, 0.099, 0.122),
        major_radius=0.011,
        minor_radius=0.0018,
        rotation=(math.radians(90), 0.0, 0.0),
    )
    gem = primitive_uv_sphere(
        "FoxBase_AccPendant_gem",
        location=(-0.004, 0.104, 0.108),
        scale=(0.0055, 0.0055, 0.007),
        segments=20,
        ring_count=10,
    )
    join_objects(OBJECTS["accessoryPendant"], [ring, gem])


def main():
    for key in ("accessoryTie", "accessoryBadge", "accessoryBow", "accessoryPendant"):
        remove_object(OBJECTS[key])

    build_tie()
    build_badge()
    build_bow()
    build_pendant()
    bpy.ops.wm.save_mainfile()
    print("Updated fox-base accessory library in source blend.")


if __name__ == "__main__":
    main()
