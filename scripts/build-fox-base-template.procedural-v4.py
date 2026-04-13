import math
import os
import shutil
import subprocess
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
ASSET_ROOT = PROJECT_ROOT / "assets" / "fox-base"
SOURCE_ROOT = ASSET_ROOT / "source"
EXPORT_ROOT = ASSET_ROOT / "export"
PUBLIC_DEMO_ROOT = PROJECT_ROOT / "public" / "demo"

TEMPLATE_VERSION = "fox-base-v4"
STAGE_VERSION = "fox-base-poster-stage-v4"

SOURCE_BLEND = SOURCE_ROOT / f"{TEMPLATE_VERSION}.blend"
EXPORT_GLB = EXPORT_ROOT / f"{TEMPLATE_VERSION}.glb"
EXPORT_USD = EXPORT_ROOT / f"{TEMPLATE_VERSION}.usd"
EXPORT_USDZ = EXPORT_ROOT / f"{TEMPLATE_VERSION}.usdz"
EXPORT_POSTER = EXPORT_ROOT / f"{TEMPLATE_VERSION}-poster.png"
EXPORT_STAGE_GLB = EXPORT_ROOT / f"{STAGE_VERSION}.glb"
PUBLIC_GLB = PUBLIC_DEMO_ROOT / f"{TEMPLATE_VERSION}.glb"
PUBLIC_USDZ = PUBLIC_DEMO_ROOT / f"{TEMPLATE_VERSION}.usdz"
PUBLIC_POSTER = PUBLIC_DEMO_ROOT / f"{TEMPLATE_VERSION}-poster.png"

USDZIP_BIN = Path(os.environ.get("USDZIP_BIN", "/usr/bin/usdzip"))


PALETTE = {
    "body": (0.42, 0.18, 0.085, 1.0),
    "face": (0.78, 0.69, 0.62, 1.0),
    "accent": (0.085, 0.05, 0.04, 1.0),
    "eye": (0.018, 0.013, 0.012, 1.0),
    "glow": (0.98, 0.62, 0.46, 1.0),
    "ground": (0.88, 0.85, 0.82, 1.0),
    "shadow": (0.64, 0.57, 0.53, 1.0),
}


def ensure_directories():
    for path in (SOURCE_ROOT, EXPORT_ROOT, PUBLIC_DEMO_ROOT):
        path.mkdir(parents=True, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    for datablock_collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.curves,
        bpy.data.images,
    ):
        for datablock in list(datablock_collection):
            if datablock.users == 0:
                datablock_collection.remove(datablock)

    for collection in list(bpy.data.collections):
        if collection.users == 0:
            bpy.data.collections.remove(collection)

    world = bpy.context.scene.world
    if world and world.use_nodes:
        nodes = world.node_tree.nodes
        links = world.node_tree.links
        nodes.clear()
        background = nodes.new(type="ShaderNodeBackground")
        background.inputs["Color"].default_value = (0.58, 0.56, 0.55, 1.0)
        background.inputs["Strength"].default_value = 0.05
        output = nodes.new(type="ShaderNodeOutputWorld")
        background.location = (0, 0)
        output.location = (220, 0)
        links.new(background.outputs["Background"], output.inputs["Surface"])


def active_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def set_object_name(obj, name):
    obj.name = name
    if hasattr(obj.data, "name"):
        obj.data.name = f"{name}_Data"
    return obj


def apply_scale(obj):
    active_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def shade_smooth(obj):
    active_only(obj)
    bpy.ops.object.shade_smooth()


def add_subsurf(obj, levels):
    modifier = obj.modifiers.new(name="Subsurf", type="SUBSURF")
    modifier.levels = levels
    modifier.render_levels = levels


def assign_material(obj, material):
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def make_material(
    name,
    base_color,
    roughness,
    metallic=0.0,
    emission_color=None,
    emission_strength=0.0,
):
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    shader = nodes.new(type="ShaderNodeBsdfPrincipled")
    output.location = (220, 0)
    shader.location = (0, 0)
    shader.inputs["Base Color"].default_value = base_color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic

    if emission_strength > 0:
        if "Emission Color" in shader.inputs:
            shader.inputs["Emission Color"].default_value = emission_color or base_color
        elif "Emission" in shader.inputs:
            shader.inputs["Emission"].default_value = emission_color or base_color

        if "Emission Strength" in shader.inputs:
            shader.inputs["Emission Strength"].default_value = emission_strength

    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def create_uv_sphere(
    name,
    location,
    scale,
    radius=1.0,
    segments=48,
    rings=24,
    rotation=None,
    material=None,
    subsurf=1,
):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius,
        location=location,
        segments=segments,
        ring_count=rings,
    )
    obj = set_object_name(bpy.context.active_object, name)
    obj.scale = scale
    apply_scale(obj)
    if rotation is not None:
        obj.rotation_euler = rotation
    if subsurf > 0:
        add_subsurf(obj, subsurf)
    shade_smooth(obj)
    if material:
        assign_material(obj, material)
    return obj


def create_cube(
    name,
    location,
    scale,
    rotation=None,
    material=None,
    subsurf=1,
):
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=location)
    obj = set_object_name(bpy.context.active_object, name)
    obj.scale = scale
    apply_scale(obj)
    if rotation is not None:
        obj.rotation_euler = rotation
    if subsurf > 0:
        add_subsurf(obj, subsurf)
    shade_smooth(obj)
    if material:
        assign_material(obj, material)
    return obj


def create_cone(
    name,
    location,
    rotation,
    scale,
    radius=1.0,
    depth=1.0,
    vertices=32,
    material=None,
    subsurf=1,
):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        radius2=0.06,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = set_object_name(bpy.context.active_object, name)
    obj.scale = scale
    apply_scale(obj)
    if subsurf > 0:
        add_subsurf(obj, subsurf)
    shade_smooth(obj)
    if material:
        assign_material(obj, material)
    return obj


def create_cylinder(
    name,
    location,
    scale,
    radius=1.0,
    depth=1.0,
    vertices=28,
    rotation=None,
    material=None,
    subsurf=1,
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
    )
    obj = set_object_name(bpy.context.active_object, name)
    obj.scale = scale
    apply_scale(obj)
    if rotation is not None:
        obj.rotation_euler = rotation
    if subsurf > 0:
        add_subsurf(obj, subsurf)
    shade_smooth(obj)
    if material:
        assign_material(obj, material)
    return obj


def create_torus(
    name,
    location,
    rotation,
    major_radius,
    minor_radius,
    material=None,
):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
        major_segments=56,
        minor_segments=14,
    )
    obj = set_object_name(bpy.context.active_object, name)
    shade_smooth(obj)
    if material:
        assign_material(obj, material)
    return obj


def create_tail(name, points, bevel_depth, material=None):
    curve_data = bpy.data.curves.new(name=f"{name}_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 24
    curve_data.bevel_depth = bevel_depth
    curve_data.bevel_resolution = 8

    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(points) - 1)

    for bezier_point, point in zip(spline.bezier_points, points):
        bezier_point.co = Vector(point["co"])
        bezier_point.handle_left_type = "AUTO"
        bezier_point.handle_right_type = "AUTO"

    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.scene.collection.objects.link(obj)
    active_only(obj)
    bpy.ops.object.convert(target="MESH")
    obj = set_object_name(bpy.context.active_object, name)
    shade_smooth(obj)
    add_subsurf(obj, 1)
    if material:
        assign_material(obj, material)
    return obj


def add_to_collection(collection, obj):
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    if obj.name in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.unlink(obj)


def bounds_world(objects):
    min_corner = Vector((float("inf"), float("inf"), float("inf")))
    max_corner = Vector((float("-inf"), float("-inf"), float("-inf")))

    for obj in objects:
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world_corner.x)
            min_corner.y = min(min_corner.y, world_corner.y)
            min_corner.z = min(min_corner.z, world_corner.z)
            max_corner.x = max(max_corner.x, world_corner.x)
            max_corner.y = max(max_corner.y, world_corner.y)
            max_corner.z = max(max_corner.z, world_corner.z)

    return min_corner, max_corner


def normalize_pet(objects):
    min_corner, max_corner = bounds_world(objects)
    center_x = (min_corner.x + max_corner.x) * 0.5
    center_y = (min_corner.y + max_corner.y) * 0.5
    ground_offset = min_corner.z

    for obj in objects:
        obj.location.x -= center_x
        obj.location.y -= center_y
        obj.location.z -= ground_offset

    bpy.context.view_layer.update()


def scale_pet(objects, factor):
    for obj in objects:
        obj.location *= factor
        obj.scale = [value * factor for value in obj.scale]
        apply_scale(obj)

    bpy.context.view_layer.update()


def scale_pet_to_target_length(objects, target_length):
    min_corner, max_corner = bounds_world(objects)
    current_length = max_corner.y - min_corner.y

    if current_length <= 0:
        return

    scale_pet(objects, target_length / current_length)
    normalize_pet(objects)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def configure_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"

    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1400
    scene.render.resolution_percentage = 100

    if hasattr(scene, "eevee") and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 64

    scene.view_settings.look = "None"
    scene.view_settings.exposure = -1.15
    scene.render.filepath = str(EXPORT_POSTER)


def configure_stage(pet_objects):
    scene = bpy.context.scene

    bpy.ops.mesh.primitive_plane_add(size=1.5, location=(0, 0, -0.001))
    ground = set_object_name(bpy.context.active_object, "FoxBase_StagePlane")
    ground_material = make_material(
        "FoxBase_StagePlane_Mat",
        PALETTE["ground"],
        roughness=0.96,
    )
    assign_material(ground, ground_material)

    camera_data = bpy.data.cameras.new("FoxBase_StageCam_Data")
    camera = bpy.data.objects.new("FoxBase_StageCam", camera_data)
    scene.collection.objects.link(camera)
    camera.location = Vector((0.29, 0.4, 0.15))
    look_at(camera, (0.0, 0.086, 0.072))
    camera.data.lens = 74
    scene.camera = camera

    light_specs = [
        ("FoxBase_StageSun", "SUN", (0.16, 0.18, 0.82), (54, 0, 148), 0.88, (1.0, 0.95, 0.92)),
        ("FoxBase_StageKey", "SPOT", (-0.12, 0.42, 0.2), (80, 0, 210), 620, (1.0, 0.92, 0.88)),
        ("FoxBase_StageRim", "SPOT", (0.28, -0.12, 0.24), (116, 0, 36), 180, (0.96, 0.88, 1.0)),
    ]

    for name, light_type, location, rotation, energy, color in light_specs:
        light_data = bpy.data.lights.new(name=f"{name}_Data", type=light_type)
        light_data.energy = energy
        light_data.color = color
        if light_type == "SPOT":
            light_data.spot_size = math.radians(54)
            light_data.spot_blend = 0.28
            light_data.shadow_soft_size = 0.35
        elif light_type == "SUN":
            light_data.angle = math.radians(7.5)
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        light.rotation_euler = [math.radians(value) for value in rotation]
        scene.collection.objects.link(light)

    scene.view_settings.gamma = 1.0
    configure_render()

    min_corner, max_corner = bounds_world(pet_objects)
    scene.cursor.location = ((min_corner.x + max_corner.x) * 0.5, 0.0, 0.0)


def select_objects(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def select_named_objects(names):
    objects = [bpy.data.objects[name] for name in names if name in bpy.data.objects]
    if not objects:
        return
    select_objects(objects)


def copy_output(source, destination):
    shutil.copy2(source, destination)


def package_usdz():
    if EXPORT_USDZ.exists():
        EXPORT_USDZ.unlink()

    candidate_commands = [
        [str(USDZIP_BIN), str(EXPORT_USDZ), "--arkitAsset", str(EXPORT_USD)],
        [str(USDZIP_BIN), "--arkitAsset", str(EXPORT_USD), str(EXPORT_USDZ)],
    ]
    last_error = None

    for command in candidate_commands:
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            if EXPORT_USDZ.exists():
                return
        except subprocess.CalledProcessError as error:
            last_error = error.stderr.strip() or error.stdout.strip() or str(error)

    raise RuntimeError(f"Failed to build USDZ with usdzip: {last_error}")


def build_pet():
    pet_collection = bpy.data.collections.new("FoxBaseV4")
    bpy.context.scene.collection.children.link(pet_collection)

    materials = {
        "body": make_material("FoxBase_Body_Mat", PALETTE["body"], roughness=0.5),
        "face": make_material("FoxBase_Face_Mat", PALETTE["face"], roughness=0.64),
        "accent": make_material("FoxBase_Accent_Mat", PALETTE["accent"], roughness=0.4),
        "eye": make_material(
            "FoxBase_Eye_Mat",
            PALETTE["eye"],
            roughness=0.08,
            emission_color=PALETTE["glow"],
            emission_strength=0.34,
        ),
        "glow": make_material(
            "FoxBase_Glow_Mat",
            PALETTE["glow"],
            roughness=0.24,
            emission_color=PALETTE["glow"],
            emission_strength=1.45,
        ),
    }

    pet_objects = []

    body = create_cube(
        "FoxBase_Body",
        location=(0.0, -0.004, 0.052),
        scale=(0.04, 0.062, 0.043),
        material=materials["body"],
        subsurf=1,
    )
    pet_objects.append(body)

    rump = create_uv_sphere(
        "FoxBase_Rump",
        location=(0.0, -0.058, 0.053),
        scale=(0.051, 0.049, 0.048),
        material=materials["body"],
        subsurf=1,
        segments=18,
        rings=12,
    )
    pet_objects.append(rump)

    chest = create_uv_sphere(
        "FoxBase_Chest",
        location=(0.0, 0.039, 0.038),
        scale=(0.032, 0.028, 0.036),
        material=materials["face"],
        subsurf=1,
        segments=18,
        rings=10,
    )
    pet_objects.append(chest)

    neck = create_uv_sphere(
        "FoxBase_Neck",
        location=(0.0, 0.071, 0.063),
        scale=(0.029, 0.023, 0.028),
        material=materials["body"],
        subsurf=1,
        segments=18,
        rings=10,
    )
    pet_objects.append(neck)

    head = create_cube(
        "FoxBase_Head",
        location=(0.0, 0.109, 0.087),
        scale=(0.053, 0.057, 0.051),
        rotation=(math.radians(-4), 0.0, 0.0),
        material=materials["body"],
        subsurf=1,
    )
    pet_objects.append(head)

    muzzle = create_cube(
        "FoxBase_Muzzle",
        location=(0.0, 0.149, 0.071),
        scale=(0.019, 0.028, 0.015),
        rotation=(math.radians(1), 0.0, 0.0),
        material=materials["face"],
        subsurf=1,
    )
    pet_objects.append(muzzle)

    nose = create_uv_sphere(
        "FoxBase_Nose",
        location=(0.0, 0.169, 0.072),
        scale=(0.007, 0.0064, 0.0058),
        material=materials["accent"],
        subsurf=1,
        segments=12,
        rings=8,
    )
    pet_objects.append(nose)

    ear_left = create_cone(
        "FoxBase_EarLeft",
        location=(0.03, 0.104, 0.145),
        rotation=(math.radians(3), math.radians(-17), math.radians(14)),
        scale=(0.02, 0.018, 0.062),
        radius=0.68,
        depth=1.0,
        vertices=14,
        material=materials["body"],
        subsurf=1,
    )
    pet_objects.append(ear_left)

    ear_right = create_cone(
        "FoxBase_EarRight",
        location=(-0.03, 0.104, 0.145),
        rotation=(math.radians(3), math.radians(17), math.radians(-14)),
        scale=(0.02, 0.018, 0.062),
        radius=0.68,
        depth=1.0,
        vertices=14,
        material=materials["body"],
        subsurf=1,
    )
    pet_objects.append(ear_right)

    inner_ear_left = create_cone(
        "FoxBase_InnerEarLeft",
        location=(0.027, 0.114, 0.132),
        rotation=(math.radians(4), math.radians(-12), math.radians(10)),
        scale=(0.012, 0.01, 0.036),
        radius=0.62,
        depth=0.9,
        vertices=12,
        material=materials["face"],
        subsurf=1,
    )
    pet_objects.append(inner_ear_left)

    inner_ear_right = create_cone(
        "FoxBase_InnerEarRight",
        location=(-0.027, 0.114, 0.132),
        rotation=(math.radians(4), math.radians(12), math.radians(-10)),
        scale=(0.012, 0.01, 0.036),
        radius=0.62,
        depth=0.9,
        vertices=12,
        material=materials["face"],
        subsurf=1,
    )
    pet_objects.append(inner_ear_right)

    tail = create_tail(
        "FoxBase_Tail",
        points=[
            {"co": (0.0, -0.072, 0.056)},
            {"co": (0.003, -0.126, 0.112)},
            {"co": (0.046, -0.092, 0.168)},
        ],
        bevel_depth=0.016,
        material=materials["body"],
    )
    pet_objects.append(tail)

    tail_tip = create_uv_sphere(
        "FoxBase_TailTip",
        location=(0.049, -0.088, 0.17),
        scale=(0.024, 0.024, 0.021),
        material=materials["glow"],
        subsurf=1,
        segments=16,
        rings=10,
    )
    pet_objects.append(tail_tip)

    paw_specs = [
        ("FoxBase_PawFrontLeft", (0.023, 0.026, 0.019)),
        ("FoxBase_PawFrontRight", (-0.023, 0.026, 0.019)),
        ("FoxBase_PawBackLeft", (0.028, -0.048, 0.018)),
        ("FoxBase_PawBackRight", (-0.028, -0.048, 0.018)),
    ]
    for name, location in paw_specs:
        paw = create_cylinder(
            name,
            location=location,
            scale=(0.012, 0.012, 0.043),
            radius=0.7,
            depth=0.9,
            vertices=12,
            material=materials["accent"],
            subsurf=1,
        )
        pet_objects.append(paw)

    eye_left = create_uv_sphere(
        "FoxBase_EyeLeft",
        location=(0.0185, 0.144, 0.082),
        scale=(0.0115, 0.008, 0.0115),
        material=materials["eye"],
        subsurf=1,
        segments=16,
        rings=10,
    )
    eye_right = create_uv_sphere(
        "FoxBase_EyeRight",
        location=(-0.0185, 0.144, 0.082),
        scale=(0.0115, 0.008, 0.0115),
        material=materials["eye"],
        subsurf=1,
        segments=16,
        rings=10,
    )
    pet_objects.extend([eye_left, eye_right])

    cheek_left = create_uv_sphere(
        "FoxBase_CheekLeft",
        location=(0.019, 0.145, 0.064),
        scale=(0.0095, 0.0075, 0.0075),
        material=materials["face"],
        subsurf=1,
        segments=16,
        rings=10,
    )
    cheek_right = create_uv_sphere(
        "FoxBase_CheekRight",
        location=(-0.019, 0.145, 0.064),
        scale=(0.0095, 0.0075, 0.0075),
        material=materials["face"],
        subsurf=1,
        segments=16,
        rings=10,
    )
    pet_objects.extend([cheek_left, cheek_right])

    collar = create_torus(
        "FoxBase_Collar",
        location=(0.0, 0.077, 0.056),
        rotation=(math.radians(90), 0.0, 0.0),
        major_radius=0.024,
        minor_radius=0.0034,
        material=materials["accent"],
    )
    pet_objects.append(collar)

    charm_bell = create_uv_sphere(
        "FoxBase_CharmBell",
        location=(0.0, 0.102, 0.036),
        scale=(0.0074, 0.0074, 0.0074),
        material=materials["accent"],
        subsurf=1,
        segments=16,
        rings=10,
    )
    pet_objects.append(charm_bell)

    charm_tag = create_cone(
        "FoxBase_CharmTag",
        location=(0.0, 0.102, 0.036),
        rotation=(math.radians(90), 0.0, math.radians(18)),
        scale=(0.0078, 0.0078, 0.0035),
        radius=0.92,
        depth=0.36,
        vertices=5,
        material=materials["glow"],
        subsurf=1,
    )
    pet_objects.append(charm_tag)

    normalize_pet(pet_objects)
    scale_pet_to_target_length(pet_objects, 0.165)

    for obj in pet_objects:
        add_to_collection(pet_collection, obj)

    configure_stage(pet_objects)
    return pet_collection, pet_objects


def export_assets(pet_objects):
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))

    bpy.context.scene.render.filepath = str(EXPORT_POSTER)
    bpy.ops.render.render(write_still=True)

    select_objects(pet_objects)
    bpy.ops.export_scene.gltf(
        filepath=str(EXPORT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_lights=False,
        export_cameras=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )

    bpy.ops.wm.usd_export(
        filepath=str(EXPORT_USD),
        selected_objects_only=True,
        export_materials=True,
    )

    select_named_objects(
        [
            "FoxBase_StagePlane",
            "FoxBase_StageCam",
            "FoxBase_StageSun",
            "FoxBase_StageKey",
            "FoxBase_StageRim",
        ]
    )
    bpy.ops.export_scene.gltf(
        filepath=str(EXPORT_STAGE_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_lights=True,
        export_cameras=True,
    )

    package_usdz()

    copy_output(EXPORT_GLB, PUBLIC_GLB)
    copy_output(EXPORT_USDZ, PUBLIC_USDZ)
    copy_output(EXPORT_POSTER, PUBLIC_POSTER)


def main():
    ensure_directories()
    clear_scene()
    _, pet_objects = build_pet()
    export_assets(pet_objects)
    print(f"Saved source blend: {SOURCE_BLEND}")
    print(f"Saved template glb: {EXPORT_GLB}")
    print(f"Saved poster stage glb: {EXPORT_STAGE_GLB}")
    print(f"Saved template usdz: {EXPORT_USDZ}")
    print(f"Saved poster: {EXPORT_POSTER}")


if __name__ == "__main__":
    main()
